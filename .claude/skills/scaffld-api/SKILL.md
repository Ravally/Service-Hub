---
name: scaffld-api
description: "Build backend logic, Firebase Functions, Firestore rules, and data handlers for Scaffld. Use when: creating cloud functions, writing Firestore security rules, building data handlers, integrating third-party APIs (Stripe, Twilio, email), or any server-side logic. Triggers: 'create a function', 'cloud function', 'backend for', 'Firestore rules', 'security rules', 'webhook', 'API integration', or requests involving data processing, payments, or notifications."
---

# Scaffld Backend / Firebase Functions

## Overview

Build secure backend logic for Scaffld's field service platform. The app uses Firebase as its entire backend — Firestore for data, Firebase Auth for authentication, Firebase Functions for server-side logic, and Firebase Hosting for deployment.

## Tech Stack

- **Database:** Cloud Firestore (NoSQL)
- **Auth:** Firebase Authentication (email/password + invite system)
- **Backend:** Firebase Cloud Functions (Node.js)
- **Payments:** Stripe (connected via Functions)
- **SMS:** Twilio (via Functions)
- **Email:** Firebase Extensions or SendGrid (via Functions)
- **Hosting:** Firebase Hosting
- **Language:** JavaScript (Node.js for Functions, JSX for client)

## Firestore Data Model

### Collection Structure

Scaffld is **multi-tenant by company**. All business data nests under `companies/{companyId}/`.

```
users/{uid}                          # System-level user profiles
  - email, name, role, companyId, inviteCode, createdAt

companies/{companyId}                # Company/organization settings
  - name, slug, phone, email, address, timezone, logoUrl, settings
  
companies/{companyId}/clients/{id}   # Client records
  - firstName, lastName, email, phone, company, addresses[], contacts[], tags[]
  
companies/{companyId}/jobs/{id}      # Job records
  - title, clientId, status, scheduledDate, assignees[], lineItems[], visits[]
  
companies/{companyId}/quotes/{id}    # Quote records
  - clientId, status, lineItems[], optionalItems[], discount, tax, depositRequired
  
companies/{companyId}/invoices/{id}  # Invoice records
  - clientId, jobId, status, lineItems[], discount, tax, paymentTerms, amountPaid
  
companies/{companyId}/formTemplates/{id}    # Form/checklist templates
companies/{companyId}/formResponses/{id}    # Completed form submissions
companies/{companyId}/timesheets/{id}       # Time tracking entries
companies/{companyId}/staff/{id}            # Staff/team members
companies/{companyId}/notifications/{id}    # In-app notifications
companies/{companyId}/products/{id}         # Product/service catalog
```

### Key Rules
- **Everything under companies/{companyId}/** — this is the tenant boundary
- **User's companyId** links them to their company — stored on the user doc
- **clientId, jobId, quoteId** — cross-references use Firestore doc IDs
- **Status fields** — always use values from `src/constants/statusConstants.js`
- **Money** — store as numbers (not cents in this codebase — the app uses decimal dollars with `toFixed(2)` for display)
- **Timestamps** — use `serverTimestamp()` for createdAt/updatedAt

## Client-Side Data Handlers

The existing pattern for data mutations is handler modules in `src/hooks/data/`:

```
hooks/data/
├── useAppHandlers.js        # Orchestrator — imports and exposes all handlers
├── clientHandlers.js        # Client CRUD
├── quoteHandlers.js         # Quote lifecycle (create, send, approve, convert)
├── jobHandlers.js           # Job CRUD
├── invoiceHandlers.js       # Invoice lifecycle
├── settingsHandlers.js      # Settings save operations
├── handlerUtils.js          # Shared utilities (generateId, timestamps, etc.)
├── useClients.js            # Client data subscription hook
├── useQuotes.js             # Quote data subscription hook
├── useJobs.js               # Job data subscription hook
├── useInvoices.js           # Invoice data subscription hook
├── useFirestore.js          # Generic Firestore CRUD
├── useFirebaseSubscriptions.js  # Real-time listener setup
├── useFormTemplates.js      # Form template CRUD
├── useFormResponses.js      # Form response management
├── useTimeTracking.js       # Time entry CRUD
└── usePublicAccess.js       # Public token-based access
```

### Handler Pattern (follow this for new features):

```javascript
// src/hooks/data/[feature]Handlers.js
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';

export function create[Feature]Handlers(companyId) {
  const collectionRef = collection(db, 'companies', companyId, '[features]');

  const handleCreate = async (data) => {
    const docRef = await addDoc(collectionRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  };

  const handleUpdate = async (id, updates) => {
    const ref = doc(db, 'companies', companyId, '[features]', id);
    await updateDoc(ref, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  };

  const handleDelete = async (id) => {
    const ref = doc(db, 'companies', companyId, '[features]', id);
    await deleteDoc(ref);
  };

  return { handleCreate, handleUpdate, handleDelete };
}
```

Then register in `useAppHandlers.js` so it's available via `AppStateContext`.

### Data Subscription Hook Pattern:

```javascript
// src/hooks/data/use[Features].js
import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';

export function use[Features](companyId) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    const q = query(
      collection(db, 'companies', companyId, '[features]'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [companyId]);

  return { items, loading };
}
```

## Firebase Cloud Functions

For server-side logic (webhooks, email sending, scheduled tasks):

```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Stripe webhook handler
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  // Verify signature, process event, update Firestore
});

// Send invoice email (callable)
exports.sendInvoiceEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const { invoiceId, companyId } = data;
  // Fetch invoice, generate PDF, send email
});

// Scheduled: Mark overdue invoices
exports.markOverdueInvoices = functions.pubsub.schedule('every 24 hours').onRun(async () => {
  // Query invoices past due date, update status to 'overdue'
});
```

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Company data — only members of that company
    match /companies/{companyId}/{document=**} {
      allow read, write: if request.auth != null 
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.companyId == companyId;
    }
    
    // Public access (quotes, client portal) via token
    match /companies/{companyId}/quotes/{quoteId} {
      allow read: if resource.data.publicToken == request.resource.data.publicToken;
    }
  }
}
```

## Rules

### Security
- **Company scoping:** Every Firestore read/write goes through `companies/{companyId}/`
- **Auth check:** Cloud Functions always verify `context.auth`
- **Public routes:** Use token-based access (existing pattern in `usePublicAccess.js`)
- **Never trust client input:** Validate in Cloud Functions for sensitive operations (payments, status changes)

### Architecture
- **Client-side handlers** for CRUD that the user initiates (create job, edit client)
- **Cloud Functions** for: webhooks, scheduled tasks, email/SMS sending, payment processing, anything requiring secrets
- **Security Rules** as the enforced access layer — never rely only on client-side checks

### Naming
- **Handlers:** `[feature]Handlers.js` → `create[Feature]Handlers(companyId)`
- **Hooks:** `use[Features].js` → `use[Features](companyId)`
- **Functions:** `functions/[feature].js` → descriptive export name
- **Collections:** lowercase plural: `clients`, `jobs`, `invoices`, `quotes`

### Do NOT
- Use Prisma, PostgreSQL, or SQL — this is Firestore
- Use Next.js patterns (Route Handlers, Server Actions, middleware)
- Store secrets in client code — use Cloud Function environment config
- Skip `serverTimestamp()` on createdAt/updatedAt
- Create deeply nested subcollections (max 2 levels: `companies/{id}/[collection]`)
- Forget to update `useAppHandlers.js` when adding new handlers

## Checklist Before Finishing

- [ ] Data scoped under `companies/{companyId}/`
- [ ] Handlers follow existing pattern and registered in useAppHandlers
- [ ] Real-time subscriptions via onSnapshot (not one-time reads for UI data)
- [ ] `serverTimestamp()` on createdAt and updatedAt
- [ ] Security rules updated if new collection added
- [ ] Cloud Functions for anything requiring secrets or server-side processing
- [ ] Error handling with user-friendly messages
