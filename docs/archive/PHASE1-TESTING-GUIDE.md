# Phase 1 Testing Guide

## ✅ What's Been Implemented

### Part 1.1: Enhanced Client Hub
- PDF invoice generation
- Service request modal
- Tabbed jobs view (Upcoming/Past)
- Payment history table
- Service history timeline
- Mobile-responsive improvements

### Part 1.2: Portal Security
- Token expiration (90 days)
- Access logging for security auditing
- Token creation timestamps

---

## 🧪 Testing Checklist

### Pre-Test Setup

1. **Ensure dev server is running**
   ```bash
   npm run dev
   # Server should be at http://localhost:5173/
   ```

2. **Login to Service Hub**
   - Navigate to http://localhost:5173/
   - Login with your admin account

---

### Test 1: PDF Invoice Generation

**Steps:**
1. Navigate to a client detail page
2. Click on an invoice
3. In the invoice detail view, click "Download PDF" (if available)
   - *Or test from the client portal (see Test 3)*

**Expected Results:**
- ✅ PDF downloads automatically
- ✅ PDF contains company logo (if set)
- ✅ PDF shows all line items in a formatted table
- ✅ PDF includes subtotal, tax, total
- ✅ PDF shows payment history if any payments made
- ✅ PDF filename: `invoice_<number>.pdf`

**What to Verify:**
- Company details appear in top-right
- Client details under "Bill To"
- All line items with quantities and prices
- Calculations are correct
- Professional formatting

---

### Test 2: Service Request Modal

**Steps:**
1. Generate a client portal link:
   - Go to a client detail page
   - Click "Generate Portal Link"
   - Copy the link
2. Open the portal link in a new incognito/private window
3. Click the "Request Service" button in the portal

**Expected Results:**
- ✅ Modal opens with service request form
- ✅ Can select service type from dropdown
- ✅ Can choose preferred date
- ✅ Can enter notes
- ✅ "Submit Request" button works
- ✅ Success message appears
- ✅ Modal closes after submission

**What to Verify in Admin:**
1. Go to Dashboard
2. Check notifications - should see "New service request from [Client Name]"
3. Verify a new document was created in Firestore:
   - Collection: `users/{userId}/serviceRequests`
   - Fields: clientId, serviceType, preferredDate, notes, status: 'New'

---

### Test 3: Enhanced Client Portal

#### 3.1 Request Service Button
**Steps:**
1. Open client portal link (from Test 2)
2. Verify "Request Service" button is prominent in header

**Expected:**
- ✅ Button visible on desktop and mobile
- ✅ Button positioned next to welcome message
- ✅ Button is blue with white text

#### 3.2 Tabbed Jobs View
**Steps:**
1. In client portal, scroll to "Your Jobs" section
2. Click "Upcoming" tab
3. Click "Past" tab

**Expected:**
- ✅ Two tabs: "Upcoming" and "Past"
- ✅ Tab shows count: "Upcoming (2)"
- ✅ Upcoming shows future jobs
- ✅ Past shows past jobs
- ✅ Active tab highlighted in blue
- ✅ Jobs sorted by date

#### 3.3 Payment History
**Steps:**
1. Make a test payment on an invoice in the portal
2. Scroll to "Payment History" section

**Expected:**
- ✅ Section only appears if payments exist
- ✅ Table shows: Date, Invoice, Method, Amount
- ✅ Payments sorted by date (newest first)
- ✅ Table is scrollable on mobile

#### 3.4 Service History
**Steps:**
1. Mark a job as "Completed" in admin
2. Refresh client portal
3. Scroll to "Service History" section

**Expected:**
- ✅ Section only appears if completed jobs exist
- ✅ Shows job title and completion date
- ✅ Shows linked invoice if exists
- ✅ Limited to 10 most recent
- ✅ Shows notes preview

#### 3.5 Invoice PDF Download
**Steps:**
1. In client portal, find an invoice
2. Click "📄 PDF" button

**Expected:**
- ✅ PDF downloads immediately
- ✅ Contains all invoice details
- ✅ Professional formatting

#### 3.6 Mobile Responsiveness
**Steps:**
1. Open portal on mobile device or resize browser to mobile width
2. Test all sections

**Expected:**
- ✅ Header stacks vertically on mobile
- ✅ "Request Service" button full-width on mobile
- ✅ Jobs tabs work on mobile
- ✅ Payment history table scrolls horizontally
- ✅ All text readable
- ✅ Touch targets are large enough

---

### Test 4: Portal Security - Token Expiration

**Manual Test (90-day expiration):**
1. Open Firebase console
2. Navigate to a client document
3. Manually edit `portalTokenCreatedAt` to a date 91 days ago
4. Try to access the portal with that client's token

**Expected:**
- ✅ Portal shows error: "This portal link has expired. Please contact the business for a new link."
- ❌ Portal does NOT load client data

**Quote Token Test:**
1. Navigate to a quote document in Firebase
2. Edit `tokenCreatedAt` to 91 days ago
3. Try to access the quote approval link

**Expected:**
- ✅ Shows error: "This quote link has expired. Please contact the business for a new link."

---

### Test 5: Portal Security - Access Logging

**Steps:**
1. Open Firebase console
2. Access a client portal link
3. Navigate to Firestore: `users/{userId}/portalAccessLogs`

**Expected:**
- ✅ New document created with:
  - `timestamp`: ISO date/time
  - `clientId`: Client ID
  - `action`: "view_portal"
  - `userAgent`: Browser user agent
  - `clientName`: Client name (in metadata)

**Quote Access Test:**
1. Access a quote approval link
2. Check `portalAccessLogs` collection

**Expected:**
- ✅ Log entry with:
  - `action`: "view_quote_approval"
  - `quoteId` and `quoteNumber` in metadata

---

### Test 6: Token Creation Timestamps

**Steps:**
1. In admin, generate a new client portal link
2. Check the client document in Firebase
3. Verify `portalTokenCreatedAt` field exists with current timestamp

**For Quotes:**
1. Generate a quote approval link
2. Check quote document
3. Verify `tokenCreatedAt` field exists

**Expected:**
- ✅ All new tokens have creation timestamps
- ✅ Timestamps are ISO 8601 format
- ✅ Timestamps match current date/time

---

## 🐛 Known Issues / Limitations

### Current Limitations:
1. **PDF Generation:**
   - Logo must be publicly accessible URL
   - Large images may slow PDF generation
   - Complex line items may need formatting tweaks

2. **Service Request:**
   - No email notification to business (Part 2)
   - No status tracking UI for admin
   - Service types are hardcoded

3. **Token Expiration:**
   - Old tokens (created before this feature) won't expire
   - No UI to regenerate expired tokens (manual Firebase edit needed)

4. **Access Logging:**
   - Logs stored indefinitely (no auto-cleanup)
   - No admin UI to view logs (Firebase console only)

---

## 🔧 Troubleshooting

### PDF Generation Fails
**Problem:** "Failed to generate PDF" error
**Solution:**
- Check console for errors
- Verify invoice has line items
- Try with simpler invoice first
- Check if jsPDF loaded correctly

### Service Request Modal Doesn't Open
**Problem:** Button click does nothing
**Solution:**
- Check browser console for errors
- Verify modal component imported correctly
- Check if Firebase connection active

### Portal Shows "Client not found"
**Problem:** Portal loads but shows error
**Solution:**
- Verify token format: `{userId}.{clientId}.{random}`
- Check if client exists in Firebase
- Verify client hasn't been deleted
- Try generating a new portal link

### Access Logs Not Created
**Problem:** No logs in Firebase
**Solution:**
- Check Firebase security rules allow writes to `portalAccessLogs`
- Verify navigator.userAgent available
- Check browser console for errors
- Ensure async logging doesn't fail silently

---

## ✅ Success Criteria

All tests pass when:

- [ ] PDF downloads work for all invoices
- [ ] Service request creates notification and document
- [ ] Portal tabs switch correctly
- [ ] Payment history displays when payments exist
- [ ] Service history shows completed jobs
- [ ] Mobile view looks professional
- [ ] Expired tokens show error message
- [ ] Access logs created in Firebase
- [ ] New tokens have timestamps
- [ ] No console errors during normal operation

---

## 📊 Performance Benchmarks

**Target Performance:**
- Portal load time: < 2 seconds
- PDF generation: < 3 seconds
- Service request submission: < 2 seconds
- Tab switching: < 100ms
- Mobile interactions: smooth 60fps

**How to Measure:**
1. Open Chrome DevTools
2. Go to Performance tab
3. Record interaction
4. Verify no jank or long tasks

---

## 🚀 Next Steps After Testing

If all tests pass:
1. ✅ Mark Phase 1 Part 1 as complete
2. 📝 Document any issues found
3. 🔧 Fix critical bugs
4. ⬆️ Push to remote
5. 🔀 Create pull request
6. ➡️ Proceed with Part 2 (Email/SMS integration)

---

**Testing Completed By:** _________________
**Date:** _________________
**Status:** ⬜ Pass ⬜ Fail ⬜ Partial
**Notes:**
