---
name: trellio-db
description: "Design and manage Firestore collections, documents, indexes, and data models for Trellio. Use when: adding new collections, designing document schemas, creating composite indexes, writing data migration scripts, updating security rules, or any database structure work. Triggers: 'add a collection', 'data model', 'Firestore', 'database schema', 'add a field', 'indexes', 'security rules', or requests about data modeling for jobs, clients, invoices, schedules, or crew."
---

# Trellio Firestore Data Design

## Overview

Design and manage Cloud Firestore data structures for Trellio — a multi-tenant field service management platform. Firestore is the sole database. All business data is scoped under `companies/{companyId}/`.

## Tech Stack

- **Database:** Cloud Firestore (NoSQL, document-based)
- **Auth:** Firebase Authentication
- **Backend:** Firebase Cloud Functions (when server-side logic needed)
- **Client SDK:** Firebase JS SDK v9+ (modular imports)

## Multi-Tenancy Model

**Every business document lives under `companies/{companyId}/`.** This is non-negotiable.

```
companies/{companyId}/clients/{clientId}
companies/{companyId}/jobs/{jobId}
companies/{companyId}/quotes/{quoteId}
companies/{companyId}/invoices/{invoiceId}
```

The `companyId` comes from the authenticated user's profile:
```javascript
// From AuthContext:
const user = auth.currentUser;
const userDoc = await getDoc(doc(db, 'users', user.uid));
const companyId = userDoc.data().companyId;
```

## Existing Collections (Do Not Break)

### `users/{uid}` (top-level, not under companies)
```javascript
{
  uid: "firebase-auth-uid",
  email: "owner@brightplumbing.com",
  displayName: "Sam Rivera",
  role: "owner",           // owner | admin | manager | technician
  companyId: "company-id", // links to their company
  inviteCode: "ABC123",    // for team member onboarding
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `companies/{companyId}`
```javascript
{
  name: "Bright Plumbing Co.",
  slug: "bright-plumbing",
  phone: "(555) 123-4567",
  email: "office@brightplumbing.com",
  timezone: "America/New_York",
  logoUrl: "https://...",
  settings: {
    invoiceDefaults: { paymentTerms: "net30", taxRate: 8.5, ... },
    quoteDefaults: { ... },
    branding: { primaryColor: "#0EA5A0", ... },
    notifications: { ... }
  },
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `companies/{companyId}/clients/{clientId}`
```javascript
{
  firstName: "Maria",
  lastName: "Chen",
  email: "maria@example.com",
  phone: "(555) 234-5678",
  company: "Chen Properties",
  addresses: [
    {
      label: "Primary",
      street1: "123 Oak Street",
      street2: "",
      city: "Austin",
      state: "TX",
      zip: "78701",
      country: "US",
      lat: 30.2672,
      lng: -97.7431,
      isPrimary: true,
      isBilling: true
    }
  ],
  contacts: [
    { name: "John Chen", phone: "(555) 234-5679", email: "john@example.com", role: "Spouse" }
  ],
  tags: ["VIP", "Residential"],
  leadSource: "Google",
  customFields: {},
  notes: "Prefers morning appointments",
  portalToken: "random-token-string",
  status: "active",           // active | inactive | lead
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `companies/{companyId}/jobs/{jobId}`
```javascript
{
  title: "Water heater replacement",
  clientId: "client-doc-id",
  propertyIndex: 0,          // index into client's addresses array
  status: "scheduled",       // unscheduled | scheduled | in_progress | completed | cancelled
  assignees: ["staff-id-1", "staff-id-2"],
  scheduledDate: Timestamp,
  scheduledEndDate: Timestamp,
  lineItems: [
    { description: "50-gal water heater", quantity: 1, unitCost: 850, total: 850 },
    { description: "Installation labor", quantity: 3, unitCost: 95, total: 285 }
  ],
  labour: [
    { staffId: "staff-id-1", hours: 3, rate: 95, total: 285 }
  ],
  expenses: [
    { description: "Parts from supplier", amount: 45, receiptUrl: "https://..." }
  ],
  visits: [
    { date: Timestamp, notes: "Assessed existing unit", completed: true }
  ],
  notes: "Client wants same-day if possible",
  attachments: [],
  checklistTemplateId: "template-id",   // linked form/checklist
  quoteId: "quote-id-if-converted",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `companies/{companyId}/quotes/{quoteId}`
```javascript
{
  clientId: "client-doc-id",
  quoteNumber: "Q-001",
  status: "draft",           // draft | sent | awaiting_approval | approved | converted | declined | archived
  lineItems: [
    { description: "Service", quantity: 1, unitCost: 500, total: 500, required: true }
  ],
  optionalItems: [
    { description: "Extended warranty", quantity: 1, unitCost: 150, total: 150 }
  ],
  discount: { type: "percent", value: 10 },   // percent | fixed
  taxRate: 8.5,
  subtotal: 500,
  taxAmount: 42.5,
  total: 542.5,
  depositRequired: true,
  depositAmount: 200,
  clientMessage: "Thank you for choosing us!",
  internalNotes: "",
  publicToken: "random-token",    // for public approval link
  signatureDataUrl: "",           // base64 signature if captured
  templateId: "",                 // if created from template
  sentAt: Timestamp,
  approvedAt: Timestamp,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### `companies/{companyId}/invoices/{invoiceId}`
```javascript
{
  clientId: "client-doc-id",
  jobId: "job-id-if-linked",
  quoteId: "quote-id-if-linked",
  invoiceNumber: "INV-001",
  status: "draft",           // draft | sent | unpaid | partially_paid | paid | overdue | void
  lineItems: [
    { description: "Service", quantity: 1, unitCost: 500, total: 500 }
  ],
  discount: { type: "fixed", value: 0 },
  taxRate: 8.5,
  subtotal: 500,
  taxAmount: 42.5,
  total: 542.5,
  amountPaid: 0,
  paymentTerms: "net30",      // due_today | due_on_receipt | net7 | net14 | net15 | net30 | net60
  dueDate: Timestamp,
  paymentSettings: {
    acceptCard: true,
    acceptACH: true,
    acceptPartialPayments: false
  },
  clientViewSettings: {
    showQuantities: true,
    showUnitCosts: true,
    showTotals: true,
    showLateStamp: true
  },
  clientMessage: "",
  internalNotes: "",
  attachments: [],
  stripePaymentLink: "",
  sentAt: Timestamp,
  paidAt: Timestamp,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## Adding a New Collection

### Step 1: Define the document schema
Document it clearly with all fields, types, and defaults.

### Step 2: Create the data hook
```
src/hooks/data/use[Features].js
```
Follow the existing `onSnapshot` subscription pattern.

### Step 3: Create the handler module
```
src/hooks/data/[feature]Handlers.js
```
Follow the existing `create[Feature]Handlers(companyId)` pattern.

### Step 4: Register in useAppHandlers
Add the new handlers to `useAppHandlers.js` so they're available through context.

### Step 5: Create composite indexes (if needed)
Add to `firestore.indexes.json`:
```json
{
  "indexes": [
    {
      "collectionGroup": "[collection]",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```
Deploy: `firebase deploy --only firestore:indexes`

### Step 6: Update security rules
Add rules for the new collection in `firestore.rules`.

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Collections | lowercase plural | `clients`, `jobs`, `invoices` |
| Document fields | camelCase | `firstName`, `scheduledDate`, `lineItems` |
| Status values | snake_case | `in_progress`, `awaiting_approval` |
| Timestamps | camelCase + At suffix | `createdAt`, `sentAt`, `approvedAt` |
| References | docId as string | `clientId: "abc123"` |
| Nested objects | camelCase | `paymentSettings`, `clientViewSettings` |
| Arrays of objects | camelCase plural | `lineItems`, `addresses`, `contacts` |

## Rules

- **companyId scoping** on every business collection — no exceptions
- **serverTimestamp()** for createdAt and updatedAt — always
- **Document IDs** auto-generated by Firestore (don't hardcode)
- **Money as decimal numbers** (not cents) — the app uses `toFixed(2)` for display
- **Don't deeply nest** — max 2 levels: `companies/{id}/[collection]/{id}`
- **Arrays for small lists** (lineItems, contacts, addresses) — not subcollections
- **Subcollections for large/queryable data** (jobs, invoices, clients)
- **Status values** must match `src/constants/statusConstants.js`
- **Indexes** needed for any compound query (status + date, assignee + status, etc.)

## Checklist Before Finishing

- [ ] Collection lives under `companies/{companyId}/`
- [ ] Document schema documented with all fields and types
- [ ] createdAt and updatedAt with serverTimestamp()
- [ ] Data hook created (`use[Features].js`)
- [ ] Handler module created (`[feature]Handlers.js`)
- [ ] Handlers registered in useAppHandlers.js
- [ ] Security rules updated
- [ ] Composite indexes added if queries use multiple fields
- [ ] Status values match constants
