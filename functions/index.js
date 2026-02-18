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

admin.initializeApp();

const emailService = require('./src/services/emailService');
const quickbooksService = require('./src/services/quickbooksService');
const xeroService = require('./src/services/xeroService');
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

// HTTPS function: POST /createDepositCheckoutSession { uid, quoteId, depositAmount, successUrl, cancelUrl, currency }
app.post('/createDepositCheckoutSession', async (req, res) => {
  try {
    const { uid, quoteId, depositAmount, successUrl, cancelUrl, currency = 'usd' } = req.body || {};
    if (!uid || !quoteId) return res.status(400).json({ error: 'uid and quoteId are required' });
    if (!depositAmount || depositAmount <= 0) return res.status(400).json({ error: 'depositAmount must be positive' });

    const quoteSnap = await db.doc(`users/${uid}/quotes/${quoteId}`).get();
    if (!quoteSnap.exists) return res.status(404).json({ error: 'Quote not found' });
    const quote = quoteSnap.data();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: depositAmount,
            product_data: {
              name: `Deposit for Quote ${quote.quoteNumber || quoteId.substring(0, 8)}`,
              description: `Deposit payment for quote ${quote.quoteNumber || quoteId}`,
            },
          },
        },
      ],
      metadata: { uid, quoteId, type: 'deposit' },
      success_url: successUrl || 'https://example.com/success',
      cancel_url: cancelUrl || 'https://example.com/cancel',
    });

    await db.doc(`users/${uid}/quotes/${quoteId}`).set(
      { depositStripeSessionId: session.id, depositAmount },
      { merge: true }
    );

    return res.json({ url: session.url, id: session.id });
  } catch (err) {
    console.error('createDepositCheckoutSession error', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
});

// HTTPS function: POST /createPaymentIntent { uid, invoiceId, amount }
// Used by mobile Tap to Pay (Stripe Terminal) — creates a PaymentIntent for in-person collection
app.post('/createPaymentIntent', async (req, res) => {
  try {
    const { uid, invoiceId, amount, currency = 'usd' } = req.body || {};
    if (!uid || !invoiceId) return res.status(400).json({ error: 'uid and invoiceId are required' });

    const { invoice, netDue } = await computeNetDue(uid, invoiceId);
    const collectAmount = amount ? Math.round(amount) : Math.round(netDue * 100);
    if (collectAmount <= 0) return res.status(400).json({ error: 'Nothing due for this invoice' });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: collectAmount,
      currency,
      payment_method_types: ['card_present'],
      capture_method: 'automatic',
      metadata: { uid, invoiceId },
      description: `Invoice ${invoice.invoiceNumber || invoiceId.substring(0, 8)}`,
    });

    return res.json({ clientSecret: paymentIntent.client_secret, id: paymentIntent.id });
  } catch (err) {
    console.error('createPaymentIntent error', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
});

// HTTPS function: POST /createConnectionToken
// Used by mobile Stripe Terminal SDK to authenticate the reader
app.post('/createConnectionToken', async (req, res) => {
  try {
    const connectionToken = await stripe.terminal.connectionTokens.create();
    return res.json({ secret: connectionToken.secret });
  } catch (err) {
    console.error('createConnectionToken error', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
});

// OAuth callbacks for accounting integrations
app.get('/quickbooks/callback', async (req, res) => {
  try {
    const url = req.url;
    const state = req.query.state; // userId
    if (!state) return res.status(400).send('Missing state parameter');
    await quickbooksService.exchangeCodeForTokens(url, state);
    const frontendUrl = process.env.FRONTEND_URL || 'https://scaffld.app';
    res.redirect(`${frontendUrl}?view=settings&connected=quickbooks`);
  } catch (err) {
    console.error('QuickBooks OAuth callback error:', err);
    res.status(500).send('OAuth failed. Please try again.');
  }
});

app.get('/xero/callback', async (req, res) => {
  try {
    const code = req.query.code;
    const state = req.query.state; // userId
    if (!state || !code) return res.status(400).send('Missing parameters');
    await xeroService.exchangeCodeForTokens(code, state);
    const frontendUrl = process.env.FRONTEND_URL || 'https://scaffld.app';
    res.redirect(`${frontendUrl}?view=settings&connected=xero`);
  } catch (err) {
    console.error('Xero OAuth callback error:', err);
    res.status(500).send('OAuth failed. Please try again.');
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
      const paidAt = new Date().toISOString();

      // Handle deposit payments
      if (session.metadata?.type === 'deposit') {
        const quoteId = session.metadata.quoteId;
        if (uid && quoteId) {
          await db.doc(`users/${uid}/quotes/${quoteId}`).set({
            depositCollected: true,
            depositCollectedAt: paidAt,
            depositStripeSessionId: session.id,
            depositMethod: 'stripe',
            depositAmount: session.amount_total || 0,
          }, { merge: true });

          // Create notification for business owner
          await db.collection(`users/${uid}/notifications`).add({
            type: 'deposit_collected',
            title: 'Deposit Collected',
            message: `Deposit of $${((session.amount_total || 0) / 100).toFixed(2)} collected via Stripe`,
            quoteId,
            read: false,
            createdAt: paidAt,
          });
        }
        return res.json({ received: true });
      }

      // Handle invoice payments
      const invoiceId = session.metadata?.invoiceId;
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

    // Handle Tap to Pay (Terminal) payments via PaymentIntent
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      const uid = pi.metadata?.uid;
      const invoiceId = pi.metadata?.invoiceId;
      const paidAt = new Date().toISOString();

      if (uid && invoiceId) {
        const invRef = db.doc(`users/${uid}/invoices/${invoiceId}`);
        const snap = await invRef.get();
        const inv = snap.exists ? snap.data() : {};
        const payments = Array.isArray(inv.payments) ? inv.payments : [];
        const amount = (pi.amount || 0) / 100;
        payments.push({
          amount,
          tip: 0,
          method: 'Card Present',
          paymentIntentId: pi.id,
          createdAt: paidAt,
        });
        const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
        const invoiceTotal = Number(inv.total || 0);
        const newStatus = totalPaid >= invoiceTotal ? 'Paid' : 'Partially Paid';
        const updates = { status: newStatus, payments };
        if (newStatus === 'Paid') updates.paidAt = paidAt;
        await invRef.set(updates, { merge: true });
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

/**
 * Send Booking Confirmation Email
 * Callable function to send a confirmation email when a booking is created.
 */
exports.sendBookingConfirmation = functions
  .runWith({
    secrets: ['RESEND_API_KEY', 'SENDGRID_FROM_EMAIL']
  })
  .https.onCall(async (data, context) => {
  try {
    const { uid, jobId } = data;

    if (!uid || !jobId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
    }

    const jobSnap = await db.doc(`users/${uid}/jobs/${jobId}`).get();
    if (!jobSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Job not found');
    }
    const job = { id: jobSnap.id, ...jobSnap.data() };
    const details = job.bookingDetails || {};

    if (!details.customerEmail) {
      throw new functions.https.HttpsError('failed-precondition', 'No customer email on booking');
    }

    const companySnap = await db.doc(`users/${uid}/settings/companyDetails`).get();
    const company = companySnap.exists ? companySnap.data() : {};
    const companyName = company.name || 'Our Company';

    const startDate = job.start ? new Date(job.start) : null;
    const dateStr = startDate
      ? startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : 'TBD';
    const timeStr = startDate
      ? startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : 'TBD';

    // Send confirmation to customer
    await emailService.sendEmail({
      to: details.customerEmail,
      subject: `Booking Confirmed: ${details.serviceName || job.title} on ${dateStr}`,
      html: `
        <h2>Hi ${details.customerName || 'there'},</h2>
        <p>Your booking has been confirmed!</p>
        <p><strong>Service:</strong> ${details.serviceName || job.title}<br>
        <strong>Date:</strong> ${dateStr}<br>
        <strong>Time:</strong> ${timeStr}</p>
        <p>${company.onlineBooking?.bookingMessage || 'Thank you for booking with us!'}</p>
        <p>Best regards,<br>${companyName}</p>
      `,
    });

    // Notify business owner
    const ownerSnap = await db.doc(`users/${uid}`).get();
    const ownerEmail = ownerSnap.exists ? ownerSnap.data().email : null;
    if (ownerEmail) {
      await emailService.sendEmail({
        to: ownerEmail,
        subject: `New Booking: ${details.serviceName || job.title} from ${details.customerName}`,
        html: `
          <h2>New Online Booking</h2>
          <p><strong>Customer:</strong> ${details.customerName} (${details.customerEmail})</p>
          <p><strong>Service:</strong> ${details.serviceName || job.title}<br>
          <strong>Date:</strong> ${dateStr}<br>
          <strong>Time:</strong> ${timeStr}</p>
          <p>Job #${job.jobNumber} has been created in your account.</p>
        `,
      });
    }

    return { success: true, message: 'Booking confirmation sent' };
  } catch (error) {
    console.error('sendBookingConfirmation error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Send Review Request Email
 * Callable function to send a review request email after job completion.
 */
exports.sendReviewRequest = functions
  .runWith({
    secrets: ['RESEND_API_KEY', 'SENDGRID_FROM_EMAIL']
  })
  .https.onCall(async (data, context) => {
  try {
    const { uid, jobId, reviewToken } = data;

    if (!uid || !jobId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing uid or jobId');
    }

    const jobSnap = await db.doc(`users/${uid}/jobs/${jobId}`).get();
    if (!jobSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Job not found');
    }
    const job = { id: jobSnap.id, ...jobSnap.data() };

    const clientSnap = job.clientId
      ? await db.doc(`users/${uid}/clients/${job.clientId}`).get()
      : null;
    if (!clientSnap || !clientSnap.exists || !clientSnap.data().email) {
      throw new functions.https.HttpsError('failed-precondition', 'Client has no email');
    }
    const client = clientSnap.data();

    const companySnap = await db.doc(`users/${uid}/settings/companyDetails`).get();
    const company = companySnap.exists ? companySnap.data() : {};
    const companyName = company.name || 'Our Company';

    const tplSnap = await db.doc(`users/${uid}/settings/emailTemplates`).get();
    const templates = tplSnap.exists ? tplSnap.data() : {};

    const token = reviewToken || job.reviewToken || '';
    const reviewLink = token
      ? `${company.websiteUrl || 'https://scaffld.app'}?reviewToken=${token}`
      : '';

    const subject = (templates.reviewRequestSubject || 'How was your experience? — {{companyName}}')
      .replace(/\{\{companyName\}\}/g, companyName)
      .replace(/\{\{jobTitle\}\}/g, job.title || 'your service');

    const bodyText = (templates.reviewRequestBody || 'Hi {{clientName}},\n\nPlease leave us a review:\n{{reviewLink}}\n\nThank you!\n{{companyName}}')
      .replace(/\{\{clientName\}\}/g, client.name || 'there')
      .replace(/\{\{companyName\}\}/g, companyName)
      .replace(/\{\{jobTitle\}\}/g, job.title || 'your service')
      .replace(/\{\{reviewLink\}\}/g, reviewLink);

    const htmlBody = bodyText.split('\n').map(line => line ? `<p>${line}</p>` : '<br>').join('\n');

    await emailService.sendEmail({
      to: client.email,
      subject,
      html: htmlBody,
    });

    return { success: true, message: 'Review request email sent' };
  } catch (error) {
    console.error('sendReviewRequest error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Send Email Campaign
 * Callable function to send a marketing campaign to segmented recipients.
 */
exports.sendEmailCampaign = functions
  .runWith({
    secrets: ['RESEND_API_KEY', 'SENDGRID_FROM_EMAIL'],
    timeoutSeconds: 540,
  })
  .https.onCall(async (data, context) => {
  try {
    const { uid, campaignId } = data;
    if (!uid || !campaignId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing uid or campaignId');
    }

    const campaignSnap = await db.doc(`users/${uid}/campaigns/${campaignId}`).get();
    if (!campaignSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Campaign not found');
    }
    const campaign = { id: campaignSnap.id, ...campaignSnap.data() };

    const companySnap = await db.doc(`users/${uid}/settings/companyDetails`).get();
    const company = companySnap.exists ? companySnap.data() : {};
    const companyName = company.name || 'Our Company';
    const baseUrl = company.websiteUrl || 'https://scaffld.app';

    // Fetch all clients
    const clientsSnap = await db.collection(`users/${uid}/clients`).get();
    const allClients = clientsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Filter recipients
    let recipients = allClients.filter(c => c.email && !c.commPrefs?.marketingOptOut);
    const { recipientType, statusFilter, tagFilter, customRecipientIds } = campaign;

    if (recipientType === 'byStatus' && statusFilter?.length) {
      recipients = recipients.filter(c => statusFilter.includes(c.status));
    } else if (recipientType === 'byTag' && tagFilter?.length) {
      recipients = recipients.filter(c => c.tags?.some(t => tagFilter.includes(t)));
    } else if (recipientType === 'custom' && customRecipientIds?.length) {
      recipients = recipients.filter(c => customRecipientIds.includes(c.id));
    }

    // Mark as Sending
    await campaignSnap.ref.update({ status: 'Sending', updatedAt: new Date().toISOString() });

    let sentCount = 0;
    let failedCount = 0;

    for (const client of recipients) {
      try {
        const unsubscribeLink = `${baseUrl}?unsubscribe=${uid}.${client.id}`;
        const subject = (campaign.subject || '')
          .replace(/\{\{clientName\}\}/g, client.name || 'there')
          .replace(/\{\{companyName\}\}/g, companyName)
          .replace(/\{\{clientEmail\}\}/g, client.email || '');

        const bodyText = (campaign.body || '')
          .replace(/\{\{clientName\}\}/g, client.name || 'there')
          .replace(/\{\{companyName\}\}/g, companyName)
          .replace(/\{\{clientEmail\}\}/g, client.email || '');

        const htmlBody = bodyText.split('\n').map(l => l ? `<p>${l}</p>` : '<br>').join('\n')
          + `<br><hr style="border:none;border-top:1px solid #eee;margin:20px 0"><p style="font-size:12px;color:#999;">You received this because you are a client of ${companyName}. <a href="${unsubscribeLink}">Unsubscribe</a></p>`;

        await emailService.sendEmail({ to: client.email, subject, html: htmlBody });
        sentCount++;
      } catch (err) {
        console.error(`Campaign email failed for ${client.email}:`, err);
        failedCount++;
      }
    }

    const now = new Date().toISOString();
    await campaignSnap.ref.update({
      status: 'Sent',
      sentAt: now,
      sentCount,
      failedCount,
      recipientCount: recipients.length,
      updatedAt: now,
    });

    // Notification
    await db.collection(`users/${uid}/notifications`).add({
      type: 'campaign_sent',
      title: 'Campaign Sent',
      message: `"${campaign.name}" sent to ${sentCount} recipient${sentCount !== 1 ? 's' : ''}`,
      campaignId,
      read: false,
      createdAt: now,
    });

    return { success: true, sentCount, failedCount };
  } catch (error) {
    console.error('sendEmailCampaign error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ── Accounting Integration Functions ──

/**
 * Initiate OAuth flow for QuickBooks or Xero
 */
exports.initiateAccountingOAuth = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  const { provider } = data;
  if (!['quickbooks', 'xero'].includes(provider)) {
    throw new functions.https.HttpsError('invalid-argument', 'Provider must be quickbooks or xero');
  }
  try {
    const service = provider === 'quickbooks' ? quickbooksService : xeroService;
    const url = await service.getAuthorizationUrl(context.auth.uid);
    return { url };
  } catch (error) {
    console.error('initiateAccountingOAuth error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Disconnect an accounting provider
 */
exports.disconnectAccounting = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  const { provider } = data;
  try {
    const service = provider === 'quickbooks' ? quickbooksService : xeroService;
    await service.disconnect(context.auth.uid);
    return { success: true };
  } catch (error) {
    console.error('disconnectAccounting error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Sync a single invoice to the connected accounting provider
 */
exports.syncToAccounting = functions
  .runWith({ timeoutSeconds: 60 })
  .https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  const uid = context.auth.uid;
  const { invoiceId } = data;
  if (!invoiceId) throw new functions.https.HttpsError('invalid-argument', 'invoiceId required');

  try {
    const settingsSnap = await db.doc(`users/${uid}/settings/companyDetails`).get();
    const settings = settingsSnap.exists ? settingsSnap.data() : {};
    const qbConnected = settings.integrations?.quickbooks?.connected;
    const xeroConnected = settings.integrations?.xero?.connected;
    if (!qbConnected && !xeroConnected) {
      throw new functions.https.HttpsError('failed-precondition', 'No accounting provider connected');
    }

    const invSnap = await db.doc(`users/${uid}/invoices/${invoiceId}`).get();
    if (!invSnap.exists) throw new functions.https.HttpsError('not-found', 'Invoice not found');
    const invoice = { id: invSnap.id, ...invSnap.data() };

    const clientSnap = invoice.clientId ? await db.doc(`users/${uid}/clients/${invoice.clientId}`).get() : null;
    const client = clientSnap?.exists ? { id: clientSnap.id, ...clientSnap.data() } : { name: 'Unknown' };

    const service = qbConnected ? quickbooksService : xeroService;
    const result = await service.syncInvoice(uid, invoice, client);

    // Sync payments if any
    if (Array.isArray(invoice.payments) && invoice.payments.length > 0 && result.externalId) {
      for (const payment of invoice.payments) {
        try { await service.syncPayment(uid, result.externalId, payment); } catch (e) { console.error('Payment sync error:', e); }
      }
    }

    return { success: true, externalId: result.externalId };
  } catch (error) {
    console.error('syncToAccounting error:', error);
    // Record sync error on invoice
    if (invoiceId) {
      await db.doc(`users/${uid}/invoices/${invoiceId}`).set({
        accountingSync: { syncError: error.message, syncedAt: null },
      }, { merge: true });
    }
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Sync all unsynced invoices to the connected accounting provider
 */
exports.syncAllToAccounting = functions
  .runWith({ timeoutSeconds: 540 })
  .https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  const uid = context.auth.uid;

  try {
    const settingsSnap = await db.doc(`users/${uid}/settings/companyDetails`).get();
    const settings = settingsSnap.exists ? settingsSnap.data() : {};
    const qbConnected = settings.integrations?.quickbooks?.connected;
    const xeroConnected = settings.integrations?.xero?.connected;
    const provider = qbConnected ? 'quickbooks' : xeroConnected ? 'xero' : null;
    if (!provider) throw new functions.https.HttpsError('failed-precondition', 'No accounting provider connected');

    const service = provider === 'quickbooks' ? quickbooksService : xeroService;

    // Get invoices without accountingSync or with syncError
    const invoicesSnap = await db.collection(`users/${uid}/invoices`).get();
    const unsynced = invoicesSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(inv => !inv.accountingSync?.externalId && !inv.archived && inv.status !== 'Draft');

    let synced = 0;
    let errors = 0;
    for (const invoice of unsynced) {
      try {
        const clientSnap = invoice.clientId ? await db.doc(`users/${uid}/clients/${invoice.clientId}`).get() : null;
        const client = clientSnap?.exists ? { id: clientSnap.id, ...clientSnap.data() } : { name: 'Unknown' };
        await service.syncInvoice(uid, invoice, client);
        synced++;
      } catch (e) {
        console.error(`Sync error for invoice ${invoice.id}:`, e);
        errors++;
      }
    }

    // Update last sync timestamp
    const providerKey = provider;
    const integrations = settings.integrations || {};
    await db.doc(`users/${uid}/settings/companyDetails`).set({
      integrations: {
        ...integrations,
        [providerKey]: { ...integrations[providerKey], lastSyncAt: new Date().toISOString() },
      },
    }, { merge: true });

    return { success: true, synced, errors, total: unsynced.length };
  } catch (error) {
    console.error('syncAllToAccounting error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Auto-sync: When an invoice status changes to Sent or Paid, push to accounting
 */
exports.onInvoiceStatusChange = functions.firestore
  .document('users/{uid}/invoices/{invoiceId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const { uid, invoiceId } = context.params;

    // Only trigger on status transitions to Sent or Paid
    if (before.status === after.status) return;
    if (!['Sent', 'Paid'].includes(after.status)) return;
    if (after.accountingSync?.externalId) return; // Already synced

    try {
      const settingsSnap = await db.doc(`users/${uid}/settings/companyDetails`).get();
      const settings = settingsSnap.exists ? settingsSnap.data() : {};
      const qb = settings.integrations?.quickbooks;
      const xero = settings.integrations?.xero;

      // Check if auto-sync is enabled for either provider
      const provider = (qb?.connected && qb?.autoSync) ? 'quickbooks' : (xero?.connected && xero?.autoSync) ? 'xero' : null;
      if (!provider) return;

      const service = provider === 'quickbooks' ? quickbooksService : xeroService;
      const invoice = { id: invoiceId, ...after };
      const clientSnap = after.clientId ? await db.doc(`users/${uid}/clients/${after.clientId}`).get() : null;
      const client = clientSnap?.exists ? { id: clientSnap.id, ...clientSnap.data() } : { name: 'Unknown' };

      await service.syncInvoice(uid, invoice, client);
      console.log(`Auto-synced invoice ${invoiceId} to ${provider}`);
    } catch (error) {
      console.error(`Auto-sync error for invoice ${invoiceId}:`, error);
    }
  });

// ─── AI Cloud Function ────────────────────────────────────────────────────────
const ai = require('./ai');
exports.scaffldAI = ai.scaffldAI;

// ─── SMS Cloud Functions ──────────────────────────────────────────────────────
const sms = require('./sms');
exports.sendSMS = sms.sendSMS;
exports.dailyAppointmentReminders = sms.dailyAppointmentReminders;
exports.dailyOverdueReminders = sms.dailyOverdueReminders;
exports.onMyWayNotification = sms.onMyWayNotification;
exports.jobCompletionNotification = sms.jobCompletionNotification;

