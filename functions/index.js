// Firebase Functions for Stripe payments integration (draft)
// - createCheckoutSession: Creates a Stripe Checkout Session for an invoice net of credits
// - stripeWebhook: Handles Stripe webhooks to mark invoices Paid
//
// Prereqs:
// - Set env STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET
// - Enable anonymous auth if portal/approval flows require it
// - Deploy with Firebase Functions or run locally via emulator

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');
require('dotenv').config();

const emailService = require('./src/services/emailService');

admin.initializeApp();
const db = admin.firestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || functions.config().stripe?.secret_key, { apiVersion: '2024-06-20' });

// Utility: compute net due by subtracting credit notes
async function computeNetDue(uid, invoiceId) {
  const invSnap = await db.doc(`users/${uid}/invoices/${invoiceId}`).get();
  if (!invSnap.exists) throw new Error('Invoice not found');
  const invoice = invSnap.data();
  if (invoice.isCreditNote) throw new Error('Not payable (credit note)');
  const creditsSnap = await db.collection(`users/${uid}/invoices`)
    .where('isCreditNote', '==', true)
    .where('creditForInvoiceId', '==', invoiceId)
    .get();
  const credits = creditsSnap.docs.reduce((s, d) => s + (d.data().total || 0), 0);
  const net = Math.max(0, (invoice.total || 0) - credits);
  return { invoice, netDue: net };
}

// HTTPS function: POST /createCheckoutSession { uid, invoiceId, successUrl, cancelUrl, currency }
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.post('/createCheckoutSession', async (req, res) => {
  try {
    const { uid, invoiceId, successUrl, cancelUrl, currency = 'usd' } = req.body || {};
    if (!uid || !invoiceId) return res.status(400).json({ error: 'uid and invoiceId are required' });
    const { invoice, netDue } = await computeNetDue(uid, invoiceId);
    if (netDue <= 0) return res.status(400).json({ error: 'Nothing due for this invoice' });

    const amount = Math.round(netDue * 100);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: amount,
            product_data: {
              name: `Invoice ${invoice.invoiceNumber || invoiceId.substring(0,8)}`,
              description: `Payment for invoice ${invoice.invoiceNumber || invoiceId}`,
            },
          },
        },
      ],
      metadata: { uid, invoiceId },
      success_url: successUrl || 'https://example.com/success',
      cancel_url: cancelUrl || 'https://example.com/cancel',
      allow_promotion_codes: true,
    });

    await db.doc(`users/${uid}/invoices/${invoiceId}`).set({ paymentLink: session.url }, { merge: true });
    return res.json({ url: session.url, id: session.id });
  } catch (err) {
    console.error('createCheckoutSession error', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
});

// Stripe webhook handler
const webhookApp = express();
webhookApp.use(express.raw({ type: 'application/json' }));

webhookApp.post('/', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || functions.config().stripe?.webhook_secret;
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const uid = session.metadata?.uid;
      const invoiceId = session.metadata?.invoiceId;
      const paidAt = new Date().toISOString();
      if (uid && invoiceId) {
        const invRef = db.doc(`users/${uid}/invoices/${invoiceId}`);
        const snap = await invRef.get();
        const inv = snap.exists ? snap.data() : {};
        const payments = Array.isArray(inv.payments) ? inv.payments : [];
        const amount = (session.amount_total || 0) / 100;
        payments.push({
          amount,
          tip: 0,
          method: 'Stripe Checkout',
          sessionId: session.id,
          createdAt: paidAt,
        });
        await invRef.set({ status: 'Paid', paidAt, payments }, { merge: true });
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handling error', err);
    res.status(500).send('Webhook handler error');
  }
});

exports.api = functions.https.onRequest(app);
exports.stripeWebhook = functions.https.onRequest(webhookApp);

/**
 * Scheduled: Daily reminders for quotes and invoices
 * Runs every day at 9 AM Pacific/Auckland time
 */
exports.dailyReminders = functions
  .runWith({
    secrets: ['RESEND_API_KEY', 'SENDGRID_FROM_EMAIL'],
    timeoutSeconds: 540, // 9 minutes max
  })
  .pubsub.schedule('0 9 * * *')
  .timeZone('Pacific/Auckland')
  .onRun(async (context) => {
    console.log('Starting daily reminders...');

    try {
      // Get all users
      const usersSnapshot = await db.collection('users').get();

      for (const userDoc of usersSnapshot.docs) {
        const uid = userDoc.id;

        try {
          // Run reminders for this user
          await sendQuoteReminders(uid);
          await sendInvoiceReminders(uid);
        } catch (error) {
          console.error(`Error processing reminders for user ${uid}:`, error);
        }
      }

      console.log('Daily reminders completed');
    } catch (error) {
      console.error('Error in dailyReminders:', error);
    }
  });

/**
 * Manual trigger for testing reminders
 */
exports.triggerReminders = functions
  .runWith({
    secrets: ['RESEND_API_KEY', 'SENDGRID_FROM_EMAIL']
  })
  .https.onCall(async (data, context) => {
    // Require authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    const uid = context.auth.uid;

    try {
      console.log(`Manual reminder trigger for user ${uid}`);

      await sendQuoteReminders(uid);
      await sendInvoiceReminders(uid);

      return { success: true, message: 'Reminders processed successfully' };
    } catch (error) {
      console.error('Error in triggerReminders:', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

/**
 * Send reminders for quotes awaiting response > 3 days
 */
async function sendQuoteReminders(uid) {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const quotesSnapshot = await db.collection(`users/${uid}/quotes`)
    .where('status', '==', 'Awaiting Response')
    .get();

  for (const quoteDoc of quotesSnapshot.docs) {
    const quote = { id: quoteDoc.id, ...quoteDoc.data() };

    // Skip if sent less than 3 days ago
    if (!quote.sentAt || new Date(quote.sentAt) > threeDaysAgo) continue;

    // Skip if reminder sent in last 7 days (avoid spam)
    if (quote.lastReminderSentAt) {
      const lastReminder = new Date(quote.lastReminderSentAt);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      if (lastReminder > sevenDaysAgo) continue;
    }

    try {
      // Get client
      const clientSnap = await db.doc(`users/${uid}/clients/${quote.clientId}`).get();
      if (!clientSnap.exists || !clientSnap.data().email) continue;

      const client = clientSnap.data();

      // Get company info
      const companySnap = await db.doc(`users/${uid}`).get();
      const company = companySnap.exists ? companySnap.data() : {};

      // Send reminder email
      await emailService.sendEmail({
        to: client.email,
        subject: `Reminder: Quote ${quote.quoteNumber || quote.id.substring(0, 8)} from ${company.name || 'Service Hub'}`,
        html: `
          <h2>Hi ${client.name || 'there'},</h2>
          <p>Just a friendly reminder about the quote we sent you.</p>
          <p><strong>Quote Number:</strong> ${quote.quoteNumber || quote.id.substring(0, 8)}<br>
          <strong>Total:</strong> $${(quote.total || 0).toFixed(2)}</p>
          ${quote.approvalLink ? `<p><a href="${quote.approvalLink}" style="display:inline-block;padding:12px 24px;background-color:#428bca;color:white;text-decoration:none;border-radius:4px;margin:20px 0;">View & Approve Quote</a></p>` : ''}
          <p>If you have any questions, please don't hesitate to reach out.</p>
          <p>Best regards,<br>${company.name || 'Service Hub'}</p>
        `,
      });

      // Update reminder tracking
      await quoteDoc.ref.update({
        lastReminderSentAt: new Date().toISOString(),
        reminderCount: (quote.reminderCount || 0) + 1,
      });

      console.log(`Quote reminder sent: ${quote.id}`);
    } catch (error) {
      console.error(`Error sending quote reminder ${quote.id}:`, error);
    }
  }
}

/**
 * Send reminders for invoices due today or overdue
 */
async function sendInvoiceReminders(uid) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const invoicesSnapshot = await db.collection(`users/${uid}/invoices`)
    .where('status', 'in', ['Unpaid', 'Sent', 'Partially Paid'])
    .get();

  for (const invoiceDoc of invoicesSnapshot.docs) {
    const invoice = { id: invoiceDoc.id, ...invoiceDoc.data() };

    if (!invoice.dueDate) continue;

    const dueDate = new Date(invoice.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const isOverdue = dueDate < today;
    const isDueToday = dueDate.getTime() === today.getTime();

    // Skip if not due today and not overdue
    if (!isDueToday && !isOverdue) continue;

    // Skip if reminder sent in last 3 days for overdue (avoid spam)
    if (isOverdue && invoice.lastReminderSentAt) {
      const lastReminder = new Date(invoice.lastReminderSentAt);
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      if (lastReminder > threeDaysAgo) continue;
    }

    try {
      // Get client
      const clientSnap = await db.doc(`users/${uid}/clients/${invoice.clientId}`).get();
      if (!clientSnap.exists || !clientSnap.data().email) continue;

      const client = clientSnap.data();

      // Get company info
      const companySnap = await db.doc(`users/${uid}`).get();
      const company = companySnap.exists ? companySnap.data() : {};

      const subject = isOverdue
        ? `Overdue Invoice Reminder: ${invoice.invoiceNumber || invoice.id.substring(0, 8)}`
        : `Invoice Due Today: ${invoice.invoiceNumber || invoice.id.substring(0, 8)}`;

      // Send reminder email
      await emailService.sendEmail({
        to: client.email,
        subject: subject,
        html: `
          <h2>Hi ${client.name || 'there'},</h2>
          <p>${isOverdue ? 'This is a reminder that your invoice is overdue.' : 'This is a reminder that your invoice is due today.'}</p>
          <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber || invoice.id.substring(0, 8)}<br>
          <strong>Total:</strong> $${(invoice.total || 0).toFixed(2)}<br>
          <strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
          ${invoice.paymentLink ? `<p><a href="${invoice.paymentLink}" style="display:inline-block;padding:12px 24px;background-color:#28a745;color:white;text-decoration:none;border-radius:4px;margin:20px 0;">Pay Now</a></p>` : ''}
          <p>Thank you for your prompt payment!</p>
          <p>Best regards,<br>${company.name || 'Service Hub'}</p>
        `,
      });

      // Update reminder tracking
      await invoiceDoc.ref.update({
        lastReminderSentAt: new Date().toISOString(),
        reminderCount: (invoice.reminderCount || 0) + 1,
      });

      console.log(`Invoice reminder sent: ${invoice.id} (${isOverdue ? 'overdue' : 'due today'})`);
    } catch (error) {
      console.error(`Error sending invoice reminder ${invoice.id}:`, error);
    }
  }
}

/**
 * Trigger: When a quote is approved, automatically create an unscheduled job
 */
exports.onQuoteApproved = functions.firestore
  .document('users/{uid}/quotes/{quoteId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const { uid, quoteId } = context.params;

    // Only trigger if status changed to "Approved" and job hasn't been created yet
    if (after.status === 'Approved' && before.status !== 'Approved' && !after.jobCreated) {
      try {
        console.log(`Creating job for approved quote: ${quoteId}`);

        // Get next job number
        const invSettingsRef = db.doc(`users/${uid}/settings/invoiceSettings`);
        const settingsSnap = await invSettingsRef.get();
        const settings = settingsSnap.exists ? settingsSnap.data() : {};
        const seq = settings.nextJob || 1;
        const prefix = settings.prefixJob || 'JOB';
        const padding = settings.padding ?? 4;
        const jobNumber = `${prefix}-${String(seq).padStart(padding, '0')}`;

        // Update settings with next job number
        await invSettingsRef.set({ nextJob: seq + 1 }, { merge: true });

        // Get quote title from line items
        const title = after.lineItems?.[0]?.description || after.lineItems?.[0]?.name || `Job for Quote ${after.quoteNumber || quoteId.substring(0, 8)}`;

        // Create job
        const jobRef = await db.collection(`users/${uid}/jobs`).add({
          status: 'Unscheduled',
          clientId: after.clientId,
          quoteId: quoteId,
          title: title,
          jobNumber: jobNumber,
          createdAt: new Date().toISOString(),
          lineItems: after.lineItems || [],
          notes: after.notes || '',
        });

        // Mark quote as having a job created
        await change.after.ref.update({
          jobCreated: true,
          jobId: jobRef.id,
        });

        console.log(`Job ${jobNumber} created successfully for quote ${quoteId}`);
      } catch (error) {
        console.error('Error creating job from approved quote:', error);
      }
    }
  });

/**
 * Send Quote Email
 * Callable function to send a quote email to a client
 */
exports.sendQuoteEmail = functions
  .runWith({
    secrets: ['RESEND_API_KEY', 'SENDGRID_FROM_EMAIL']
  })
  .https.onCall(async (data, context) => {
  try {
    const { uid, quoteId } = data;

    if (!uid || !quoteId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
    }

    // Fetch quote, client, and company settings
    const quoteSnap = await db.doc(`users/${uid}/quotes/${quoteId}`).get();
    if (!quoteSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Quote not found');
    }
    const quote = { id: quoteSnap.id, ...quoteSnap.data() };

    const clientSnap = await db.doc(`users/${uid}/clients/${quote.clientId}`).get();
    if (!clientSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Client not found');
    }
    const client = clientSnap.data();

    if (!client.email) {
      throw new functions.https.HttpsError('failed-precondition', 'Client has no email address');
    }

    const settingsSnap = await db.doc(`users/${uid}/settings/emailTemplates`).get();
    const templates = settingsSnap.exists ? settingsSnap.data() : {};

    const companySnap = await db.doc(`users/${uid}`).get();
    const company = companySnap.exists ? companySnap.data() : {};

    // Send email via EmailService
    await emailService.sendQuoteEmail({
      to: client.email,
      quote,
      client,
      company,
      templates,
    });

    // Update quote status
    await db.doc(`users/${uid}/quotes/${quoteId}`).update({
      sentAt: new Date().toISOString(),
      status: quote.status === 'Draft' ? 'Sent' : quote.status,
    });

    return { success: true, message: 'Quote email sent successfully' };
  } catch (error) {
    console.error('sendQuoteEmail error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Send Invoice Email
 * Callable function to send an invoice email to a client
 */
exports.sendInvoiceEmail = functions
  .runWith({
    secrets: ['RESEND_API_KEY', 'SENDGRID_FROM_EMAIL']
  })
  .https.onCall(async (data, context) => {
  try {
    const { uid, invoiceId } = data;

    if (!uid || !invoiceId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
    }

    // Fetch invoice, client, and company settings
    const invoiceSnap = await db.doc(`users/${uid}/invoices/${invoiceId}`).get();
    if (!invoiceSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Invoice not found');
    }
    const invoice = { id: invoiceSnap.id, ...invoiceSnap.data() };

    const clientSnap = await db.doc(`users/${uid}/clients/${invoice.clientId}`).get();
    if (!clientSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Client not found');
    }
    const client = clientSnap.data();

    if (!client.email) {
      throw new functions.https.HttpsError('failed-precondition', 'Client has no email address');
    }

    const settingsSnap = await db.doc(`users/${uid}/settings/emailTemplates`).get();
    const templates = settingsSnap.exists ? settingsSnap.data() : {};

    const companySnap = await db.doc(`users/${uid}`).get();
    const company = companySnap.exists ? companySnap.data() : {};

    // Send email via EmailService
    await emailService.sendInvoiceEmail({
      to: client.email,
      invoice,
      client,
      company,
      templates,
    });

    // Update invoice status
    await db.doc(`users/${uid}/invoices/${invoiceId}`).update({
      sentAt: new Date().toISOString(),
      status: invoice.status === 'Draft' ? 'Sent' : invoice.status,
    });

    return { success: true, message: 'Invoice email sent successfully' };
  } catch (error) {
    console.error('sendInvoiceEmail error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

