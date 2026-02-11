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

