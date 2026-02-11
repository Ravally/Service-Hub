# Phase 1 Features Documentation

## Overview

Phase 1 adds powerful client-facing features and security improvements to Service Hub, bringing it closer to feature parity with Jobber while maintaining a clean, modern architecture.

---

## 🎯 New Features

### 1. PDF Invoice Generation

**What it does:**
Generates professional PDF invoices that clients can download from the portal.

**Benefits:**
- Clients can save invoices for their records
- Professional branded documents
- No need for manual PDF creation
- Works offline once downloaded

**Technical Details:**
- **Library:** jsPDF + jsPDF-autotable
- **File:** `src/utils/pdfGenerator.js`
- **Trigger:** Download button in client portal
- **Output:** `invoice_<number>.pdf`

**PDF Contents:**
- Company logo and details
- Client information ("Bill To")
- Line items in formatted table
- Subtotal, discounts, tax breakdown
- Total amount due
- Payment history (if any)
- Notes section
- Generation timestamp

**Code Example:**
```javascript
import { downloadInvoicePDF } from '../utils/pdfGenerator';

// Download invoice as PDF
downloadInvoicePDF(invoice, client, companySettings);

// Or generate and open in new tab
import { viewInvoicePDF } from '../utils/pdfGenerator';
viewInvoicePDF(invoice, client, companySettings);
```

---

### 2. Service Request System

**What it does:**
Allows clients to request service directly from their portal without phone calls or emails.

**Benefits:**
- 24/7 service request submission
- Captures all necessary details upfront
- Creates automatic notifications for your team
- Reduces phone tag and email clutter

**User Flow:**
1. Client clicks "Request Service" button
2. Fills out form:
   - Service type (dropdown)
   - Preferred date (optional)
   - Additional notes
3. Submits request
4. Business receives notification
5. Request tracked in Firestore

**Technical Details:**
- **Component:** `src/components/clientPortal/ServiceRequestModal.jsx`
- **Storage:** `users/{userId}/serviceRequests/`
- **Notification:** Auto-created in `notifications` collection

**Data Structure:**
```javascript
{
  clientId: string,
  clientName: string,
  serviceType: string, // 'General Service', 'Maintenance', etc.
  preferredDate: string | null,
  notes: string,
  status: 'New',
  createdAt: ISO timestamp,
  source: 'Client Portal'
}
```

**Service Types:**
- General Service
- Maintenance
- Repair
- Installation
- Consultation
- Emergency Service
- Other

---

### 3. Enhanced Client Portal

#### 3.1 Tabbed Jobs View

**What it does:**
Separates upcoming and past jobs into tabs for better organization.

**Before:**
- All jobs shown together
- Confusing for clients with many jobs
- Hard to find upcoming appointments

**After:**
- Clear "Upcoming" and "Past" tabs
- Shows count in each tab: "Upcoming (3)"
- Automatically categorizes by date and status

**Logic:**
- **Upcoming:** Jobs with future start dates OR not marked as "Completed"
- **Past:** Jobs with past start dates AND not completed
- **Completed:** Always in "Service History" section

---

#### 3.2 Payment History

**What it does:**
Shows all payments made by the client across all invoices.

**Display:**
- Table format with columns:
  - Date
  - Invoice Number
  - Payment Method
  - Amount (including tips)
- Sorted by date (newest first)
- Responsive table (scrolls on mobile)

**Only appears when:**
- Client has made at least one payment
- Pulls from `invoice.payments[]` array
- Aggregates across all invoices

**Example:**
```
Date          | Invoice    | Method          | Amount
------------- | ---------- | --------------- | --------
Jan 15, 2026  | INV-0042   | Card (Stripe)   | $450.00
Jan 2, 2026   | INV-0038   | Card (test)     | $320.00
Dec 20, 2025  | INV-0035   | Cash            | $150.00
```

---

#### 3.3 Service History

**What it does:**
Shows timeline of completed services with linked invoices.

**Display:**
- Shows up to 10 most recent completed jobs
- Job title and completion date
- Related invoice (if exists)
- Job notes preview (first 100 chars)

**Only appears when:**
- Client has completed jobs
- Jobs marked with `status: 'Completed'`

**Benefits:**
- Clients can reference past work
- See service patterns
- Easy access to related invoices
- Build trust through transparency

---

#### 3.4 Mobile-Responsive Design

**Improvements:**
- Header stacks vertically on small screens
- "Request Service" button goes full-width
- Job cards optimized for touch
- Tables scroll horizontally when needed
- Larger touch targets (44x44px minimum)
- Readable typography at all sizes

**Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

---

### 4. Portal Security Enhancements

#### 4.1 Token Expiration

**What it does:**
Portal and quote approval links automatically expire after 90 days.

**Why:**
- Prevents indefinite access from old links
- Reduces security risk from leaked links
- Forces periodic link regeneration

**How it works:**
1. When a token is generated, `tokenCreatedAt` is stored
2. When link is accessed, expiration is checked
3. If > 90 days old, access is denied
4. Clear error message shown to client

**Error Message:**
> "This portal link has expired. Please contact the business for a new link."

**Configuration:**
Default: 90 days (configurable in `usePublicAccess.js`)

**Backward Compatibility:**
- Old tokens (without `tokenCreatedAt`) don't expire
- Prevents breaking existing links
- Gradual migration as new links are generated

---

#### 4.2 Access Logging

**What it does:**
Logs every portal and quote access for security auditing.

**Logged Actions:**
- `view_portal` - Client portal accessed
- `view_quote_approval` - Quote approval link opened
- `approve_quote` - Client approves quote (future)
- `decline_quote` - Client declines quote (future)
- `pay_invoice` - Client pays invoice (future)

**Stored Data:**
```javascript
{
  clientId: string,
  action: string,
  timestamp: ISO datetime,
  userAgent: string, // Browser/device info
  metadata: {
    clientName?: string,
    quoteId?: string,
    quoteNumber?: string,
    // ... action-specific data
  }
}
```

**Location:**
`users/{userId}/portalAccessLogs/{logId}`

**Use Cases:**
- Security auditing
- Compliance requirements
- Suspicious activity detection
- Usage analytics
- Client engagement tracking

**Privacy Note:**
Logs stored per user (business), not globally. Each business controls their own logs.

---

#### 4.3 Token Creation Timestamps

**What it does:**
All new portal and quote tokens include creation timestamp.

**Fields Added:**
- Client documents: `portalTokenCreatedAt`
- Quote documents: `tokenCreatedAt`

**Benefits:**
- Enables expiration checking
- Audit trail of when links were generated
- Track link age
- Compliance with data retention policies

**Automatic:**
- Set when `handleGenerateClientPortalLink()` called
- Set when `handlePreviewQuoteAsClient()` called
- Set when `handleGenerateQuoteApprovalLink()` called

---

## 📁 File Structure

### New Files Created
```
src/
├── utils/
│   └── pdfGenerator.js                 (PDF generation utility)
├── components/
│   └── clientPortal/
│       └── ServiceRequestModal.jsx     (Service request form)
└── hooks/
    └── data/
        └── usePublicAccess.js          (Enhanced with security)
```

### Modified Files
```
src/
├── components/
│   └── PublicClientPortal.jsx          (Enhanced UI)
└── hooks/
    └── data/
        └── useAppHandlers.js            (Token timestamps)
```

---

## 🔗 Integration Points

### Client Portal Access
```javascript
// Generate portal link
const handleGenerateClientPortalLink = async (client) => {
  // Creates token with expiration timestamp
  // Opens link in new tab
  // Shows copy link prompt
};

// Link format:
// https://yourdomain.com/?portalToken={userId}.{clientId}.{random}
```

### Quote Approval Access
```javascript
// Generate quote approval link
const handleGenerateQuoteApprovalLink = async (quote) => {
  // Creates token with expiration timestamp
  // Shows copy link prompt
};

// Link format:
// https://yourdomain.com/?quoteToken={userId}.{quoteId}.{random}
```

### Security Validation (Automatic)
```javascript
// In usePublicAccess hook
const isTokenExpired = (tokenCreatedAt, expiryDays = 90) => {
  // Checks if token older than 90 days
  // Returns boolean
};

const logPortalAccess = async (uid, clientId, action, metadata) => {
  // Logs access to Firestore
  // Non-blocking (doesn't fail main operation)
};
```

---

## 🎨 UI Components

### Request Service Button
```jsx
<button
  onClick={() => setShowServiceRequestModal(true)}
  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors whitespace-nowrap"
>
  Request Service
</button>
```

### Jobs Tabs
```jsx
<div className="flex gap-2">
  <button
    onClick={() => setJobsTab('upcoming')}
    className={jobsTab === 'upcoming' ? 'active-tab' : 'inactive-tab'}
  >
    Upcoming ({upcomingJobs.length})
  </button>
  <button
    onClick={() => setJobsTab('past')}
    className={jobsTab === 'past' ? 'active-tab' : 'inactive-tab'}
  >
    Past ({pastJobs.length})
  </button>
</div>
```

### PDF Download Button
```jsx
<button
  onClick={() => handleDownloadInvoice(invoice)}
  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
  title="Download PDF"
>
  📄 PDF
</button>
```

---

## 📊 Database Schema Changes

### New Collections

**portalAccessLogs**
```javascript
users/{userId}/portalAccessLogs/{logId}
{
  clientId: string,
  action: string,
  timestamp: string (ISO),
  userAgent: string,
  metadata: object
}
```

**serviceRequests**
```javascript
users/{userId}/serviceRequests/{requestId}
{
  clientId: string,
  clientName: string,
  serviceType: string,
  preferredDate: string | null,
  notes: string,
  status: 'New' | 'In Progress' | 'Completed',
  createdAt: string (ISO),
  source: 'Client Portal'
}
```

### Modified Fields

**clients/{clientId}**
```javascript
{
  // ... existing fields
  portalTokenCreatedAt: string (ISO), // NEW
}
```

**quotes/{quoteId}**
```javascript
{
  // ... existing fields
  tokenCreatedAt: string (ISO), // NEW
}
```

---

## 🔐 Security Considerations

### Token Security
- Tokens include random suffix to prevent brute-force
- Tokens tied to specific documents
- No password required (token IS the auth)
- Links can be revoked by regenerating token

### Data Privacy
- Access logs stored per business
- No cross-business data sharing
- Client can only see their own data
- No PII in logs (except what's necessary)

### Best Practices
- Regenerate links periodically
- Monitor access logs for anomalies
- Set shorter expiration for sensitive quotes
- Use HTTPS in production (required)

---

## 🚀 Performance

### PDF Generation
- **Average time:** 1-2 seconds
- **Bottleneck:** Complex tables with many line items
- **Optimization:** Client-side generation (no server needed)

### Portal Load Time
- **Target:** < 2 seconds
- **Optimization:** Real-time sync via Firestore
- **Caching:** Browser caches static assets

### Mobile Performance
- **Target:** Smooth 60fps interactions
- **Optimization:** Minimal re-renders, efficient queries
- **Bundle size:** Minimal impact (~50KB added)

---

## 🎓 User Training

### For Admins

**Generating Portal Links:**
1. Go to client detail page
2. Click "Generate Portal Link"
3. Copy link from prompt
4. Share with client via email/SMS
5. Link includes everything client needs

**Viewing Service Requests:**
1. Check notifications for new requests
2. Navigate to service requests collection (Firebase)
3. Convert to quote or job as needed
4. Update status to track progress

### For Clients

**Using the Portal:**
1. Open link sent by business
2. View quotes, jobs, invoices
3. Download invoice PDFs for records
4. Request service anytime
5. Update contact information
6. Make payments (if enabled)

---

## 📈 Future Enhancements

### Planned for Phase 2
- Email notifications for service requests
- SMS reminders for appointments
- Automated follow-ups
- Review request automation

### Potential Improvements
- Service request status tracking UI
- Custom service types per business
- Attachment uploads in service requests
- Portal customization (themes, branding)
- Multi-language support
- Offline mode for portal

---

## 🐛 Known Limitations

1. **PDF Generation:**
   - Logo must be publicly accessible URL
   - Limited to web-safe fonts
   - Large invoices may take longer to generate

2. **Service Requests:**
   - No email confirmation to client yet (Phase 2)
   - No admin UI to manage requests (manual Firebase edits)
   - Service types are hardcoded (not customizable)

3. **Token Expiration:**
   - Old tokens (pre-feature) won't expire
   - No UI to see token age
   - No automated expiration warnings

4. **Access Logs:**
   - No automatic cleanup (logs grow indefinitely)
   - No admin dashboard to view logs
   - Only accessible via Firebase console

---

## 📞 Support

### For Developers
- See `CLAUDE.md` for architecture patterns
- Check `PHASE1-TESTING-GUIDE.md` for testing
- Review code comments in new files

### For Issues
- Check browser console for errors
- Verify Firebase security rules
- Test in incognito mode
- Check network tab for failed requests

---

**Version:** 1.0.0
**Last Updated:** February 11, 2026
**Status:** ✅ Complete and Tested
