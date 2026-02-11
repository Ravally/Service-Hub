Service Hub Functions (Stripe Draft)

Endpoints
- POST api/createCheckoutSession
  - Body: { uid, invoiceId, successUrl?, cancelUrl?, currency? }
  - Returns: { url, id }

- POST stripeWebhook
  - Raw JSON body; set Stripe webhook secret.
  - Handles checkout.session.completed and marks invoice Paid.

Setup
1) cd functions && npm install
2) Set env vars:
   - STRIPE_SECRET_KEY=sk_live_...
   - STRIPE_WEBHOOK_SECRET=whsec_...
   Or use: firebase functions:config:set stripe.secret_key=... stripe.webhook_secret=...
3) Deploy via Firebase: firebase deploy --only functions

Notes
- Net due is computed as invoice.total minus any credit notes (isCreditNote=true matching creditForInvoiceId).
- The client app currently uses a placeholder “Get Payment Link” and stores paymentLink on the invoice doc.
- After deploying, update the app to POST to api/createCheckoutSession and save the returned url to paymentLink.

