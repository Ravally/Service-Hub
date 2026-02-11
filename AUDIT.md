# Service Hub - Code Refactoring Audit Report

**Date**: 2026-02-11
**Branch**: refactor/code-organization
**Total Files Analyzed**: 46 JavaScript/JSX files

---

## Executive Summary

This codebase consists of **46 total JavaScript/JSX files** with **critical architectural issues** stemming from:
- **Monolithic component design** (2,718-line App.jsx)
- **Widespread code duplication** (10+ instances of utility functions)
- **Oversized components** (13 files over 200 lines)
- **Missing separation of concerns** (UI + data + business logic mixed)

**Total Lines in Components/Config**: 10,100+ lines across 23 large files

---

## CRITICAL FINDINGS (Severity: 🔴 Critical)

### 1. MONOLITHIC APP COMPONENT - CRITICAL ISSUE 🔴

**File**: `src/App.jsx`
**Line Count**: 2,718 lines
**Severity**: 🔴 CRITICAL

#### Problems:
- Single component manages entire application state and business logic
- **62+ useState/useEffect/useMemo hooks**
- Violates Single Responsibility Principle severely
- Mixes UI rendering with authentication, data fetching, and business logic
- All Firebase operations occur directly in this component
- Extremely difficult to test, maintain, and debug
- Performance implications from excessive re-renders
- State management not scalable as features grow

#### State Variables Identified (57):
```javascript
clients, quotes, jobs, invoices, staff, quoteTemplates, notifications,
userProfile, clientNotes, companySettings, invoiceSettings, emailTemplates,
newQuote, newJob, logoFile, newInvite, newTemplate, newStaff, isLoading,
error, userId, activeView, selectedClient, selectedProperty, selectedJob,
selectedQuote, selectedInvoice, invoiceToPrint, quoteToPrint, invoiceCreateContext,
clientSearchTerm, clientTagFilter, clientBeingEdited, autoAddProperty,
showJobForm, showNotifications, scheduleView, scheduleRange, calendarDate,
publicQuoteContext, publicMessage, publicError, publicPortalContext
```

#### Required Refactoring:
- Extract into custom hooks (`useClients`, `useQuotes`, `useJobs`, `useInvoices`, etc.)
- Create separate context providers for authentication and app state
- Implement custom hook composition pattern
- Consider React Query/SWR for server state management

---

## HIGH SEVERITY FINDINGS (Severity: 🟠 High)

### 2. WIDESPREAD UTILITY FUNCTION DUPLICATION 🟠

#### `currency()` Function - Duplicated 10+ Times
**Files**:
- `JobDetailView.jsx`
- `InvoiceDetailView.jsx`
- `InvoiceCreateFlow.jsx`
- `InvoicePrintView.jsx`
- `QuoteCreateForm.jsx`
- `QuoteDetailView.jsx`
- `QuotePrintView.jsx`
- `PropertyDetailView.jsx`
- `InvoicesList.jsx`
- `ClientsList.jsx`

**Impact**: Inconsistent formatting across app, maintenance nightmare

#### `computeTotals()` Function - Duplicated 5+ Times
**Files**:
- `QuoteDetailView.jsx`
- `QuoteCreateForm.jsx`
- `InvoiceDetailView.jsx`
- `InvoicePrintView.jsx`
- `InvoiceCreateFlow.jsx`

**Complexity**: 30-80 lines each with identical logic
**Issue**: Multiple versions cause calculation inconsistencies

#### `formatDate()` / `formatDateTime()` - Duplicated 5+ Times
**Files**:
- `JobDetailView.jsx`
- `InvoiceDetailView.jsx`
- `InvoicePrintView.jsx`
- `QuoteDetailView.jsx`
- `ClientsList.jsx`

#### `rewriteText()` Function - Duplicated
**Files**:
- `InvoiceDetailView.jsx`
- `QuoteCreateForm.jsx`

**Logic**: Persona-based text rewriting (Cheerful, Casual, Professional, Shorter)

#### Date Range/Filtering Utilities - Duplicated
**Files**: `InvoicesList.jsx`, `QuotesList.jsx`
**Functions**: `lastNDays()`, `monthRange()`, `yearRange()`, `inRange()`, `periodRange()`, `getPreviousRange()`, `rangeLabel()`

**Required Action**: Create `/src/utils/` directory with:
- `formatters.js` - currency, date, dateTime formatting
- `calculations.js` - computeTotals, profitability calculations
- `dateUtils.js` - date manipulation and range functions
- `textUtils.js` - text transformation functions

---

### 3. OVERSIZED COMPONENTS (200+ LINES) 🟠

#### Critical (800+ lines):

| File | Lines | Responsibilities | Severity |
|------|-------|------------------|----------|
| **JobDetailView.jsx** | 1,168 | Job display, editing, labor tracking, expenses, visits, chemicals, reminders, billing | 🔴 Critical |
| **InvoiceDetailView.jsx** | 929 | Invoice display, line item editing, payment tracking, status management, client communication | 🔴 Critical |
| **CreateClient.jsx** | 822 | Client form, properties, contacts, emails, phones, tags, custom fields | 🔴 Critical |
| **QuoteDetailView.jsx** | 697 | Quote display, editing, approval flow, conversion, deposit collection, email sending | 🟠 High |
| **QuoteCreateForm.jsx** | 605 | Quote creation, line items, templates, discounts, deposits, client messaging | 🟠 High |

#### High (200-400 lines):

| File | Lines | Issues | Severity |
|------|-------|--------|----------|
| QuotesList.jsx | 441 | List rendering, filtering, KPI calculations | 🟠 High |
| ClientDetailView.jsx | 378 | Client details, property management, billing calculations | 🟠 High |
| ClientsList.jsx | 344 | Filtering, sorting, searching, KPI calculations | 🟡 Medium |
| PropertyDetailView.jsx | 318 | Property display and management | 🟡 Medium |
| InvoiceCreateFlow.jsx | 308 | Invoice creation from jobs, line item normalization | 🟡 Medium |
| PublicClientPortal.jsx | 291 | Public portal rendering, mixed concerns | 🟡 Medium |
| JobsList.jsx | 265 | Job filtering, status mapping, range calculations | 🟡 Medium |
| InvoicesList.jsx | 222 | Invoice filtering, KPI calculations, analytics | 🟡 Medium |

**Single Responsibility Violations**:
- **JobDetailView**: Handles display, editing, labor, expenses, visits, chemicals, reminders, permissions
- **CreateClient**: Client info + multiple property management + contact management + custom fields
- **QuoteDetailView**: Display + editing + approval + conversion + signature collection + email sending

---

### 4. DEEPLY NESTED CONDITIONAL LOGIC 🟠

#### Example 1: JobDetailView.jsx (Property resolution - 3+ levels)
```javascript
const jobProperty = selectedJobs.length === 1
  ? (selectedJobs[0].propertySnapshot || (Array.isArray(client?.properties)
      ? client.properties.find((p, idx) => (p.uid || p.id || String(idx)) === selectedJobs[0].propertyId)
      : null))
  : null;
```

#### Example 2: InvoicesList.jsx (KPI calculation - complex ternary chains)
```javascript
const sentDelta = (()=>{
  const prev=issuedPrev.length, cur=issuedNow.length;
  if(prev===0) return { t:'N/A', pos:true };
  const diff=((cur-prev)/prev)*100;
  return { t:`${diff>=0?'+':'-'} ${Math.abs(Math.round(diff))}%`, pos:diff>=0 };
})();
```

#### Example 3: ClientDetailView.jsx (Balance calculation - 4 levels)
Lines 73-80: Complex nested reduce with ternary operators

#### Example 4: InvoicesList.jsx (Date filtering - IIFE within ternary)
Lines 89-96: Complex inline date range selection

**Impact**: Hard to understand, debug, and test

---

### 5. LONG FUNCTIONS (40+ LINES) 🟡

#### In JobDetailView.jsx:
- `handleAddLineItem()` - 17 lines
- `handleAddLaborEntry()` - 17 lines
- `handleAddExpense()` - 15 lines
- `handleAddChemical()` - 14 lines
- `handleToggleVisitComplete()` - 13 lines
- `profitability` useMemo - 12+ lines

#### In CreateClient.jsx:
- `useEffect` prefill logic - 35+ lines (lines 71-106)
- Form submission handler - likely 40+ lines

#### In QuoteCreateForm.jsx:
- Client selection onChange handler - 9 lines (lines 163-169)
- Line item management functions chained

#### In InvoicesList.jsx:
- `kpis` useMemo - 26 lines (lines 48-74)
- `filtered` useMemo - 40+ lines (lines 86-127)

---

### 6. HARDCODED VALUES THAT SHOULD BE CONSTANTS 🟡

#### Status Color Mappings (Duplicated in Multiple Files):
- **QuotesList.jsx** (lines 18-25): STATUS_COLORS object
- **ClientsList.jsx** (lines 14-18): StatusPill component with hardcoded map
- **Multiple files**: Hardcoded status strings ('Draft', 'Approved', 'Converted', 'Archived')

#### Tax/GST Rates:
- **constants/index.js** (line 30): `taxRate: 15` hardcoded as "Default GST for NZ"
- **App.jsx**: Default GST rate hardcoded in company settings

#### Number Formatting:
- **InvoicesList.jsx** (line 31): `lastNDays(7)` hardcoded
- **InvoicesList.jsx** (line 32): 29-day window hardcoded
- **Multiple files**: `-2` digit precision hardcoded in `.toFixed(2)`

#### Element Limits:
- **QuoteCreateForm.jsx** (line 79): `itemCount < 100` hardcoded limit
- **InvoicesList.jsx** (line 50): Hardcoded status string comparisons

#### Date Defaults:
- **App.jsx** (line 94): localStorage keys hardcoded throughout
- **InvoiceDetailView.jsx** (line 30): "Due Today" default hardcoded

**Required Actions**:
Create `/src/constants/` separate files:
- `statusColors.js` - unified status color schemes
- `limits.js` - business rule limits
- `defaults.js` - default values (tax rates, payment terms, etc.)
- `dateDefaults.js` - date range configurations

---

### 7. INCONSISTENT NAMING CONVENTIONS 🟡

#### Conflicting Property Names (Same concept, different names):
```javascript
// Job properties - multiple names for same thing:
job.jobType vs job.type
job.laborEntries vs job.labor vs job.timeEntries
job.expenses vs job.costs
job.billingReminders vs job.reminders
job.chemicalTreatments vs job.treatments

// Invoice/Quote properties:
invoice.isCreditNote vs inv.creditNote
quote.quoteDiscountType vs quote.discountType
quote.quoteDiscountValue vs quote.discountValue

// Date properties:
createdAt vs issueDate vs start vs paidAt
updateDoc vs set + merge

// Communication arrays:
phones vs phone (plural/singular inconsistency)
emails vs email
```

#### Function Naming Inconsistencies:
- `currency()` vs `formatCurrency()` naming
- `computeTotals()` vs `calculateTotals()`
- `rewriteText()` vs `transformText()`
- Handler: `handleAddLineItem` vs `addLineItem` (inconsistent use of "handle" prefix)

#### State Variable Naming:
- `showLineItemForm` vs `isEditing` (different boolean prefixes)
- `billingTab` vs `overviewTab` vs `activeView` (different naming for same concept)

---

### 8. MISSING ERROR HANDLING 🟠

#### Firebase Operations (App.jsx):
- **Line 186**: `onSnapshot()` has no error callback
- **Line 262**: `collection()` and `query()` have no try-catch
- **Line 290**: `getDocs()` in fetchInitialData has generic catch ("Could not connect to database")
- **Line 123-149**: Public quote loading has basic error handling, but UI errors not logged

#### Async Operations:
- **CreateClient.jsx**: Form submission likely lacks comprehensive error handling
- **PublicClientPortal.jsx**: API calls to public endpoints lack error boundaries
- **QuoteDetailView.jsx**: Email sending, signature collection - no visible error states

#### Network Operations:
- **functions/index.js** (lines 40-76): Try-catch exists but error messages generic
- **functions/index.js** (line 87): Webhook signature verification could fail silently

---

### 9. TIGHT COUPLING BETWEEN MODULES 🟡

#### Components Coupled to Firebase:
- **App.jsx**: Direct Firestore operations mixed with React logic
- **CreateClient.jsx**: Form operations depend on specific Firestore document structure
- **PublicClientPortal.jsx**: Direct Firebase calls for public data

#### Theme/Color Coupling:
- **QuotesList.jsx**: STATUS_COLORS hardcoded in component
- **ClientsList.jsx**: StatusPill has inline color mapping
- **Multiple files**: No centralized theme system

#### Component Dependencies:
- **JobDetailView.jsx** requires: job, client, quote, invoices, visits, staff (7+ props)
- **CreateClient.jsx** requires: onBack, onSave, initialClient, autoAddProperty (complex prop drilling)
- **QuoteDetailView.jsx** requires: 16+ props for different handlers

#### Constants Coupling:
- **components/icons/index.js** (21 lines): Barrel file with just re-exports (low value)
- All components import directly from icons, not centralized

---

### 10. MIXED UI + DATA FETCHING + BUSINESS LOGIC 🟠

#### Example: InvoiceDetailView.jsx
- Lines 5-91: Utility functions (data/business logic)
- Lines 93-150+: Component logic (rendering)
- Lines 43-79: Complex total computation mixed with UI rendering
- No separation between calculation and display

#### Example: QuoteDetailView.jsx
- Lines 14-39: Business logic (computeTotals)
- Lines 41-65: UI component definitions (SectionHeader, Pill, Toggle)
- Lines 67-100+: Component logic mixing data and display
- No custom hooks for data transformation

#### Example: ClientDetailView.jsx
- Lines 48-71: Billing calculation logic
- Lines 73-80+: Complex balance computation
- Lines 32-35: Property defaulting logic mixed in component
- No separate calculation modules

#### Example: PublicClientPortal.jsx
- 291 lines combining public access logic, authentication state, and rendering
- Direct Firestore queries mixed with component rendering
- No separation of concerns for public vs. authenticated flows

---

## MODERATE FINDINGS (Severity: 🟡 Medium)

### 11. BARREL FILES WITH LOGIC 🟡

#### File: `src/components/icons/index.js` (22 lines)
- **Issue**: Barrel file that just re-exports icons
- **Current**: Simple barrel file with no logic
- **Note**: ✅ This is acceptable as-is (just imports/exports)

#### File: `src/constants/index.js` (121+ lines)
- **Issue**: Contains data initialization logic mixed with constant exports
- **Should Split Into**:
  - `statusConstants.js` - JOB_STATUSES
  - `initialState.js` - initialQuoteState, initialJobState
  - `companyDefaults.js` - initialCompanySettings
  - `invoiceDefaults.js` - initialInvoiceSettings

---

## LINE COUNT ANALYSIS

### Files Over 200 Lines (Requiring Refactoring)

```
🔴 2,718 lines - App.jsx (CRITICAL - Must refactor first)
🔴 1,168 lines - JobDetailView.jsx
🔴   929 lines - InvoiceDetailView.jsx
🔴   822 lines - CreateClient.jsx
🟠   697 lines - QuoteDetailView.jsx
🟠   605 lines - QuoteCreateForm.jsx
🟠   441 lines - QuotesList.jsx
🟠   378 lines - ClientDetailView.jsx
🟡   344 lines - ClientsList.jsx
🟡   318 lines - PropertyDetailView.jsx
🟡   308 lines - InvoiceCreateFlow.jsx
🟡   291 lines - PublicClientPortal.jsx
🟡   265 lines - JobsList.jsx
🟡   222 lines - InvoicesList.jsx
🟢   195 lines - CalendarView.jsx
🟢   188 lines - InvoicePrintView.jsx
🟢   172 lines - DashboardCards.jsx
🟢   162 lines - JobsBoard.jsx
🟢   128 lines - Sidebar.jsx
🟢   121 lines - constants/index.js
🟢   109 lines - QuotePrintView.jsx
🟢   105 lines - PublicQuoteApproval.jsx
✅    86 lines - Auth.jsx
✅    23 lines - firebase/config.js
```

**Legend**:
- 🔴 Critical (800+ lines or critical architecture issue)
- 🟠 High (600-800 lines)
- 🟡 Medium (300-600 lines)
- 🟢 Low (200-300 lines)
- ✅ Acceptable (under 200 lines)

**Total Lines in Components/Config**: 10,100+ lines across 23 large files

---

## CONFIGURATION FILES ANALYSIS

### ✅ `src/firebase/config.js` (23 lines) - GOOD
- Clean Firebase initialization
- Environment variables used correctly
- Exports properly structured
- No issues identified

### 🟡 `src/constants/index.js` (121 lines) - NEEDS REFACTORING
- Contains 4 separate concerns mixed together
- Should be split into separate files
- **Issues**:
  - Hardcoded tax rate (15)
  - Hardcoded GST references
  - Initial state logic belongs in hooks/contexts

### ✅ `vite.config.js` (5 lines) - GOOD
- Minimal, correct configuration
- No issues

### ✅ `eslint.config.js` (29 lines) - GOOD
- Proper ESLint setup
- React hooks plugin configured
- Single responsibility

### 🟡 `functions/index.js` (124 lines) - MODERATE ISSUES
- **Responsibilities**:
  - Stripe payment integration
  - Checkout session creation
  - Webhook handling
  - Invoice payment marking
- **Issues**:
  - No separation of concerns (payment logic + webhook logic)
  - Generic error messages
  - Should be split into separate functions
  - No input validation
  - No rate limiting visible

---

## ICON COMPONENTS (20 files, ~11-14 lines each) - GOOD ✅

- **Pattern**: SVG wrapper components with props support
- **Total Lines**: ~230 lines across 20 files
- **Issues**: None identified - properly small and focused

---

## SUMMARY OF REFACTORING PRIORITIES

### 🔴 CRITICAL (Must Fix):
1. **Extract App.jsx state** into custom hooks and context providers (2,718 lines → multiple files)
2. **Create utils directory** with shared formatting and calculation functions
3. **Split oversized components** (800+ lines) into smaller, focused components
4. **Reduce prop drilling** by implementing context or state management

### 🟠 HIGH (Should Fix):
1. **Centralize status colors and constants**
2. **Extract business logic** from components into custom hooks
3. **Improve error handling** in Firebase and async operations
4. **Implement data validation** for form inputs
5. **Fix duplicate code** across components

### 🟡 MEDIUM (Nice to Have):
1. **Implement design tokens** for consistent styling
2. **Create custom hooks library** for common patterns (useFormState, useAsync, etc.)
3. **Add loading/error states** consistently across components
4. **Document prop interfaces** for major components
5. **Standardize naming conventions**

---

## RECOMMENDED NEW ARCHITECTURE

```
src/
├── components/          # Presentational components (small, focused)
│   ├── common/         # Reusable UI components
│   │   ├── StatusPill.jsx
│   │   ├── LoadingSpinner.jsx
│   │   └── ErrorBoundary.jsx
│   ├── clients/        # Client-related components
│   │   ├── ClientForm.jsx
│   │   ├── ClientList.jsx
│   │   ├── ClientDetail.jsx
│   │   └── PropertyForm.jsx
│   ├── quotes/         # Quote-related components
│   ├── jobs/           # Job-related components
│   ├── invoices/       # Invoice-related components
│   ├── pages/          # Page-level components
│   └── icons/          # Icon components (keep as-is) ✅
│
├── hooks/              # Custom React hooks (NEW)
│   ├── data/
│   │   ├── useClients.js
│   │   ├── useQuotes.js
│   │   ├── useJobs.js
│   │   ├── useInvoices.js
│   │   └── useFirebaseData.js
│   ├── ui/
│   │   ├── useFormState.js
│   │   ├── useAsync.js
│   │   └── useLocalStorage.js
│   └── business/
│       ├── useTotals.js
│       └── useKPIs.js
│
├── contexts/           # React Context providers (NEW)
│   ├── AuthContext.jsx
│   ├── AppStateContext.jsx
│   └── NotificationContext.jsx
│
├── utils/              # Utility functions (NEW)
│   ├── formatters.js      # currency, date, dateTime formatting
│   ├── calculations.js    # computeTotals, profitability calculations
│   ├── dateUtils.js       # date manipulation and range functions
│   ├── textUtils.js       # text transformation functions
│   └── validation.js      # input validation helpers
│
├── firebase/           # Firebase configuration
│   ├── config.js          # ✅ Keep as-is
│   ├── firestore.js       # Data access layer (NEW)
│   ├── auth.js            # Auth helpers (NEW)
│   └── storage.js         # Storage helpers (NEW)
│
├── constants/          # Split from current index.js
│   ├── statusColors.js    # Status color mappings
│   ├── initialStates.js   # Initial state objects
│   ├── limits.js          # Business rule limits
│   └── defaults.js        # Default values (tax rates, etc.)
│
└── App.jsx             # Refactored to use hooks and contexts (target: <200 lines)
```

---

## ESTIMATED IMPACT

### Before Refactoring:
- **Largest File**: 2,718 lines (App.jsx)
- **Files > 200 lines**: 13 files
- **Total Component Lines**: 10,100+ lines
- **Code Duplication**: 10+ instances of key utilities
- **Maintainability**: Low
- **Testability**: Very difficult

### After Refactoring (Target):
- **Largest File**: <200 lines
- **Files > 200 lines**: 0 files
- **Total Project Lines**: Similar (redistributed)
- **Code Duplication**: Eliminated
- **Maintainability**: High
- **Testability**: Easy (isolated units)

---

## NEXT STEPS

1. **Review this audit** and approve refactoring priorities
2. **Create detailed refactoring plan** for Phase 2
3. **Execute refactoring** in phases (critical → high → medium)
4. **Verify functionality** after each phase
5. **Document new patterns** for team adoption

---

**End of Audit Report**
