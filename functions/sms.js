const functions = require('firebase-functions');
const admin = require('firebase-admin');
const twilio = require('twilio');

const db = admin.firestore();

// Helper: get Twilio client from user's stored credentials or env config
async function getTwilioClient(uid) {
  // Check user-level settings first, then fall back to env/config
  const settingsSnap = await db.doc(`users/${uid}/settings/integrations`).get();
  const settings = settingsSnap.exists ? settingsSnap.data() : {};
  const tw = settings.twilio || {};

  const sid = tw.sid || functions.config().twilio?.sid || process.env.TWILIO_SID;
  const token = tw.token || functions.config().twilio?.token || process.env.TWILIO_TOKEN;
  const from = tw.from || functions.config().twilio?.from || process.env.TWILIO_FROM;

  if (!sid || !token || !from) return null;

  return { client: twilio(sid, token), from };
}

// Helper: log SMS to Firestore
async function logSMS(uid, { to, body, type, relatedId, status, twilioSid }) {
  await db.collection(`users/${uid}/smsLog`).add({
    to, body, type, relatedId,
    status, twilioSid,
    sentAt: new Date().toISOString(),
  });
}

// Helper: check if a specific automation toggle is enabled
async function isAutomationEnabled(uid, toggleName) {
  const snap = await db.doc(`users/${uid}/settings/smsAutomation`).get();
  if (!snap.exists) return false;
  const settings = snap.data();
  return settings[toggleName] === true;
}

/**
 * sendSMS — Callable function for manual SMS sends.
 * Accepts { to, body, userId, type, relatedId }
 */
exports.sendSMS = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }

  const { to, body, type = 'manual', relatedId = null } = data;
  const uid = context.auth.uid;

  if (!to || !body) {
    throw new functions.https.HttpsError('invalid-argument', 'to and body are required.');
  }

  const twilioConfig = await getTwilioClient(uid);
  if (!twilioConfig) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Twilio is not configured. Set credentials in Settings > Integrations, or set environment variables: twilio.sid, twilio.token, twilio.from'
    );
  }

  try {
    const message = await twilioConfig.client.messages.create({
      to, body, from: twilioConfig.from,
    });
    await logSMS(uid, { to, body, type, relatedId, status: 'sent', twilioSid: message.sid });
    return { success: true, sid: message.sid };
  } catch (error) {
    console.error('Twilio send error:', error);
    await logSMS(uid, { to, body, type, relatedId, status: 'failed', twilioSid: null });
    throw new functions.https.HttpsError('internal', 'Failed to send SMS.');
  }
});

/**
 * dailyAppointmentReminders — HTTP function for Cloud Scheduler.
 * Queries jobs scheduled for tomorrow and sends reminders.
 *
 * Schedule: Run daily at configured time (default 6 PM)
 * gcloud scheduler jobs create http daily-appointment-reminders \
 *   --schedule="0 18 * * *" --uri=FUNCTION_URL --http-method=POST
 */
exports.dailyAppointmentReminders = functions.https.onRequest(async (req, res) => {
  try {
    const usersSnap = await db.collection('users').get();
    let totalSent = 0;

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      if (!(await isAutomationEnabled(uid, 'appointmentReminders'))) continue;

      const twilioConfig = await getTwilioClient(uid);
      if (!twilioConfig) continue;

      // Get business name
      const companySnap = await db.doc(`users/${uid}/settings/companyDetails`).get();
      const businessName = companySnap.exists ? (companySnap.data().companyName || 'Your service provider') : 'Your service provider';

      // Find jobs scheduled for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const jobsSnap = await db.collection(`users/${uid}/jobs`)
        .where('status', '==', 'Scheduled')
        .get();

      for (const jobDoc of jobsSnap.docs) {
        const job = jobDoc.data();
        const scheduledDate = (job.scheduledDate || job.startDate || '').split('T')[0];
        if (scheduledDate !== tomorrowStr) continue;
        if (!job.clientId) continue;

        // Get client phone
        const clientSnap = await db.doc(`users/${uid}/clients/${job.clientId}`).get();
        if (!clientSnap.exists) continue;
        const client = clientSnap.data();
        if (!client.phone) continue;

        const time = job.scheduledTime || job.startTime || 'the scheduled time';
        const body = `Hi ${client.firstName || client.name || 'there'}, reminder: ${job.title || 'your appointment'} is scheduled for tomorrow at ${time}. Reply to reschedule. — ${businessName}`;

        try {
          const message = await twilioConfig.client.messages.create({
            to: client.phone, body, from: twilioConfig.from,
          });
          await logSMS(uid, { to: client.phone, body, type: 'appointmentReminder', relatedId: jobDoc.id, status: 'sent', twilioSid: message.sid });
          totalSent++;
        } catch (err) {
          console.error(`Reminder failed for job ${jobDoc.id}:`, err);
        }
      }
    }

    res.json({ success: true, totalSent });
  } catch (error) {
    console.error('dailyAppointmentReminders error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * dailyOverdueReminders — HTTP function for Cloud Scheduler.
 * Sends payment reminders for overdue invoices (max once per week).
 *
 * Schedule: Run daily at 10 AM
 * gcloud scheduler jobs create http daily-overdue-reminders \
 *   --schedule="0 10 * * *" --uri=FUNCTION_URL --http-method=POST
 */
exports.dailyOverdueReminders = functions.https.onRequest(async (req, res) => {
  try {
    const usersSnap = await db.collection('users').get();
    let totalSent = 0;
    const today = new Date();

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      if (!(await isAutomationEnabled(uid, 'overdueReminders'))) continue;

      const twilioConfig = await getTwilioClient(uid);
      if (!twilioConfig) continue;

      const companySnap = await db.doc(`users/${uid}/settings/companyDetails`).get();
      const businessName = companySnap.exists ? (companySnap.data().companyName || 'Your service provider') : 'Your service provider';

      // Find overdue invoices
      const invoicesSnap = await db.collection(`users/${uid}/invoices`)
        .where('status', 'in', ['Sent', 'Unpaid', 'Overdue'])
        .get();

      for (const invDoc of invoicesSnap.docs) {
        const invoice = invDoc.data();
        if (!invoice.dueDate) continue;
        const dueDate = new Date(invoice.dueDate);
        if (dueDate >= today) continue; // Not yet overdue

        // Weekly rate limit: skip if reminded within 7 days
        if (invoice.lastReminderSent) {
          const lastReminder = new Date(invoice.lastReminderSent);
          const daysSince = (today - lastReminder) / (1000 * 60 * 60 * 24);
          if (daysSince < 7) continue;
        }

        if (!invoice.clientId) continue;
        const clientSnap = await db.doc(`users/${uid}/clients/${invoice.clientId}`).get();
        if (!clientSnap.exists) continue;
        const client = clientSnap.data();
        if (!client.phone) continue;

        const amount = invoice.total ? `$${(invoice.total / 100).toFixed(2)}` : 'the outstanding amount';
        const body = `Hi ${client.firstName || client.name || 'there'}, a friendly reminder that invoice #${invoice.invoiceNumber || invDoc.id} for ${amount} is past due. Please let us know if you have questions. — ${businessName}`;

        try {
          const message = await twilioConfig.client.messages.create({
            to: client.phone, body, from: twilioConfig.from,
          });
          await logSMS(uid, { to: client.phone, body, type: 'overdueReminder', relatedId: invDoc.id, status: 'sent', twilioSid: message.sid });

          // Update invoice with reminder tracking
          await invDoc.ref.update({
            lastReminderSent: new Date().toISOString(),
            reminderCount: (invoice.reminderCount || 0) + 1,
          });
          totalSent++;
        } catch (err) {
          console.error(`Overdue reminder failed for invoice ${invDoc.id}:`, err);
        }
      }
    }

    res.json({ success: true, totalSent });
  } catch (error) {
    console.error('dailyOverdueReminders error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * onMyWayNotification — Firestore trigger.
 * Fires when a job's onMyWay field is set to true.
 */
exports.onMyWayNotification = functions.firestore
  .document('users/{uid}/jobs/{jobId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const { uid, jobId } = context.params;

    // Trigger when onMyWay field changes to true
    if (before.onMyWay === after.onMyWay) return;
    if (!after.onMyWay) return;

    if (!(await isAutomationEnabled(uid, 'onMyWay'))) return;

    const twilioConfig = await getTwilioClient(uid);
    if (!twilioConfig) return;

    if (!after.clientId) return;
    const clientSnap = await db.doc(`users/${uid}/clients/${after.clientId}`).get();
    if (!clientSnap.exists) return;
    const client = clientSnap.data();
    if (!client.phone) return;

    const companySnap = await db.doc(`users/${uid}/settings/companyDetails`).get();
    const businessName = companySnap.exists ? (companySnap.data().companyName || 'Your service provider') : 'Your service provider';

    // Check for "running late" variant
    const techName = after.onMyWayTechName || 'your technician';
    const body = after.runningLate
      ? `Hi ${client.firstName || client.name || 'there'}, ${techName} is running a bit late but is on the way to you now. We apologise for the delay. — ${businessName}`
      : `Hi ${client.firstName || client.name || 'there'}, ${techName} is on the way. — ${businessName}`;

    try {
      const message = await twilioConfig.client.messages.create({
        to: client.phone, body, from: twilioConfig.from,
      });
      await logSMS(uid, { to: client.phone, body, type: after.runningLate ? 'runningLate' : 'onMyWay', relatedId: jobId, status: 'sent', twilioSid: message.sid });
    } catch (err) {
      console.error(`On My Way SMS failed for job ${jobId}:`, err);
    }
  });

/**
 * jobCompletionNotification — Firestore trigger.
 * Fires when a job status changes to 'Completed'.
 */
exports.jobCompletionNotification = functions.firestore
  .document('users/{uid}/jobs/{jobId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const { uid, jobId } = context.params;

    if (before.status === after.status) return;
    if (after.status !== 'Completed') return;

    if (!(await isAutomationEnabled(uid, 'jobCompletion'))) return;

    const twilioConfig = await getTwilioClient(uid);
    if (!twilioConfig) return;

    if (!after.clientId) return;
    const clientSnap = await db.doc(`users/${uid}/clients/${after.clientId}`).get();
    if (!clientSnap.exists) return;
    const client = clientSnap.data();
    if (!client.phone) return;

    const companySnap = await db.doc(`users/${uid}/settings/companyDetails`).get();
    const businessName = companySnap.exists ? (companySnap.data().companyName || 'Your service provider') : 'Your service provider';

    const body = `Hi ${client.firstName || client.name || 'there'}, your ${after.title || 'job'} is complete. Invoice coming shortly. Thanks! — ${businessName}`;

    try {
      const message = await twilioConfig.client.messages.create({
        to: client.phone, body, from: twilioConfig.from,
      });
      await logSMS(uid, { to: client.phone, body, type: 'jobCompletion', relatedId: jobId, status: 'sent', twilioSid: message.sid });
    } catch (err) {
      console.error(`Completion SMS failed for job ${jobId}:`, err);
    }
  });
