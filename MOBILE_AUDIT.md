# Mobile Responsiveness Audit — Scaffld Service Hub

**Audited:** 2026-02-19
**App URL:** my.scaffld.app
**Stack:** React 18 + Vite, Tailwind CSS (default breakpoints), Firebase

---

## Executive Summary

The webapp was designed desktop-first with partial responsive support. The app shell (sidebar + header) handles mobile via a slide-in drawer, but most page content — tables, forms, modals, kanban boards — will break or become unusable below ~768px. Only 3 of the top 20 components have any responsive classes. Tables are the biggest risk: 5 list views render bare `<table>` elements with no horizontal scroll wrapper.

**Priority fixes:** Layout shell, tables, notification panel, kanban board, forms, modals.

---

## 1. CSS / Tailwind Setup

### Breakpoints
Using **Tailwind defaults only** — no custom breakpoints defined:

| Prefix | Min-width | Usage (files / occurrences) |
|--------|-----------|---------------------------|
| `sm:`  | 640px     | 22 files / 43 occurrences |
| `md:`  | 768px     | 41 files / 97 occurrences |
| `lg:`  | 1024px    | 20 files / 31 occurrences |
| `xl:`  | 1280px    | 7 files / 7 occurrences   |
| `max-sm:` | —      | 0 files (unused)          |
| `max-md:` | —      | 0 files (unused)          |

`md:` is the dominant breakpoint. Gap between 0–640px (`sm:`) is sparsely handled.

### Viewport Meta Tag
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```
- Correct for mobile rendering
- **Missing:** `viewport-fit=cover` for iPhone notch/Dynamic Island safe areas
- **Title tag:** Still reads `service-hub-app` (Vite default), should be "Scaffld"

### Global CSS (`index.css`)
- All responsive behaviour via Tailwind utility classes in JSX — no `@media` queries in CSS
- One `@media print` rule for invoice printing
- Brand colours used via tokens in `tailwind.config.js` (some hardcoded hex in CSS as fallbacks)

### Brand Config Gap
`brand/tailwind.config.js` defines a rich type scale, spacing tokens, border-radius tokens, and animation easing — but **none of these are merged into the active build config**. They're reference-only.

---

## 2. App Shell Layout

### Structure
```
┌─────────┬──────────────────────────────────┐
│ Sidebar │  AppHeader                        │
│ w-64    │  Main content (px-4 sm:px-6 lg:px-8) │
│ lg:flex │                                    │
│         │                                    │
└─────────┴──────────────────────────────────┘
```

### Sidebar (`Sidebar.jsx` — 136 lines)
| State | Behaviour |
|-------|-----------|
| Desktop (≥1024px) | Fixed `w-64` left column, `hidden lg:flex` |
| Mobile (<1024px) | Full-screen overlay drawer, `-translate-x-full` → `translate-x-0` |
| Trigger | Hamburger button in AppHeader (`lg:hidden`) |
| Z-index | `z-50` desktop, `z-[9999]` for Create popover |

**Issues:**
- No bottom navigation bar — mobile relies entirely on hamburger → drawer
- Create button popover flies right (works desktop, may clip on mobile drawer)

### AppHeader (`AppHeader.jsx` — 77 lines)
| Element | Mobile (<768px) | Desktop |
|---------|-----------------|---------|
| Hamburger | Visible (`lg:hidden`) | Hidden |
| Search | Hidden (`hidden md:block`) | `w-64` fixed width |
| Tagline | Hidden (`hidden md:block`) | Visible |
| Notifications | Always visible | Always visible |

**Issues:**
- No mobile search — users can't search anything below 768px
- NotificationPanel is `fixed right-6 top-16 w-96` — 384px wide, clips off-screen on phones <400px

---

## 3. Complete View/Route Map

Navigation is state-based via `activeView` in `AppStateContext` (no React Router).

### Authenticated Views

| `activeView` | Component | Lines | Has Responsive? | Risk |
|---|---|---|---|---|
| `dashboard` | Inline in AppContent.jsx | ~210 | YES (`md:`, `xl:`) | LOW |
| `clients` | `ClientsList` → `ClientDetailView` → `PropertyDetailView` | 383 / 394 / 314 | PARTIAL | HIGH (table) |
| `createClient` | `CreateClient` | 586 | YES (`md:grid-cols-2`) | LOW |
| `jobs` | `JobsList` → `JobDetailView` | 275 / 108 | PARTIAL | MEDIUM (table) |
| `schedule` | `ScheduleToolbar` + list/`CalendarView` | ~30 / 376 | PARTIAL | MEDIUM (calendar grid) |
| `quotes` | `QuotesList` → `QuoteDetailView` | 421 / 660 | PARTIAL | HIGH (table) |
| `createQuote` | `QuoteCreateForm` | 584 | YES (`md:grid-cols-2`) | LOW |
| `invoices` | `InvoicesList` → `InvoiceDetailView` | 219 / 500 | PARTIAL | HIGH (table) |
| `createInvoice` | `InvoiceCreateFlow` | 278 | YES (`md:grid-cols-2`) | LOW |
| `bookings` | `BookingsList` → `JobDetailView` | 139 / 108 | YES | LOW |
| `reviews` | `ReviewsList` | 145 | YES | LOW |
| `campaigns` | `CampaignsList` → `CampaignDetailView` | 115 / 122 | YES | LOW |
| `createCampaign` | `CampaignBuilder` | 269 | YES | LOW |
| `reports` | `ReportsDashboard` (lazy) | ~100 | YES (tab scroll) | LOW |
| `expenses` | `ExpensesPage` (lazy) | 80 | Delegates to subs | MEDIUM |
| `timesheets` | `TimesheetView` (lazy) | 613 | PARTIAL | HIGH (table) |
| `settings` | `SettingsPage` (lazy, 10 tabs) | 147 | Tab scroll only | MEDIUM |
| `requests` | `PlaceholderPage` | Small | N/A | NONE |
| `apps` | Inline placeholder | 8 | N/A | NONE |

### Public / Print Views (no sidebar)

| Trigger | Component | Lines | Responsive? |
|---|---|---|---|
| `?quoteToken=` | `PublicQuoteApproval` | 186 | YES (`sm:`) |
| `?portalToken=` | `PublicClientPortal` | 542 | YES (`sm:`) |
| `?bookingToken=` | `PublicBookingPage` | 482 | YES (`md:`, `sm:`) |
| `?reviewToken=` | `PublicReviewPage` | 145 | NO (but single-column) |
| `?unsubscribe=` | `PublicUnsubscribePage` | 49 | NO (minimal) |
| `invoiceToPrint` | `InvoicePrintView` | 156 | YES (`sm:`, `md:`) |
| `quoteToPrint` | `QuotePrintView` | ~150 | YES |
| Not authenticated | `Auth` | 179 | NO (max-w-md, acceptable) |

---

## 4. Horizontal Scroll Risk

| Risk | Component | Issue |
|------|-----------|-------|
| **HIGH** | `ClientsList` | 6-column `<table>`, no `overflow-x-auto` |
| **HIGH** | `QuotesList` | Table with `w-80` status column, no `overflow-x-auto` |
| **HIGH** | `InvoicesList` | Table, no `overflow-x-auto` |
| **HIGH** | `JobsBoard` (kanban) | Fixed `w-72` columns side-by-side, no scroll wrapper |
| **HIGH** | `NotificationPanel` | `w-96` fixed, clips off-screen on phones |
| **MEDIUM** | `JobsList` | Table with wide columns, no `overflow-x-auto` |
| **MEDIUM** | `TimesheetView` | Wide time entry table, no `overflow-x-auto` |
| **MEDIUM** | `CalendarView` | 7-column month grid, tight on phones |
| **LOW** | `InvoiceDetailView` | Has `overflow-x-auto` on line items (GOOD) |
| **NONE** | Card-based views (BookingsList, ReviewsList, etc.) | Flex/grid stacks correctly |

---

## 5. Modal / Drawer / Overlay Audit

| Component | Type | Mobile Handling |
|---|---|---|
| `CommSettingsModal` | `fixed inset-0` | OK — `max-w-lg w-full` |
| `AddContactModal` | `fixed inset-0` | OK — `max-w-lg w-full` |
| `PropContactModal` | `fixed inset-0` | OK — `max-w-lg w-full` |
| Map Adjust modal (PropertyDetailView) | `fixed inset-0` | PARTIAL — `max-w-5xl` very wide |
| `NotificationPanel` | `fixed right-6 top-16 w-96` | **BROKEN** — clips off-screen |
| `ServiceRequestModal` | `fixed inset-0` | Needs check |
| `TimeEntryForm` | Modal form | Has `sm:`, `md:` classes |
| `ClampChat` | `fixed bottom-6 right-6` | OK — `max-sm:inset-0 max-sm:w-full` goes fullscreen |
| Create popover (Sidebar) | Fly-out right | May clip in mobile drawer |

---

## 6. Top 20 Most-Used Components

| Rank | Component | Imports | Responsive? |
|------|-----------|---------|-------------|
| 1 | `icons/index.js` (barrel) | 16 | No |
| 2 | `settingsShared.jsx` | 11 | No |
| 3 | `CustomFieldEditor` | 5 | No |
| 4 | `KpiCard` | 4 | No |
| 4 | `BulkActionBar` | 4 | No |
| 6 | `Pill` | 3 | No |
| 6 | `ClampButton` | 3 | No |
| 6 | `ClampRewriteButtons` | 3 | No |
| 9 | `ClampIcon` | 8 (internal) | No |
| 10 | `ReportCard` | 6 (internal) | No |
| 11 | `AppHeader` | 1 | **YES** |
| 12 | `Sidebar` | 2 | **YES** |
| 13 | `Chip` | 2 | No |
| 14 | `ClampResultPreview` | 1 | No |
| 15 | `NotificationPanel` | 1 | No |
| 16 | `PlaceholderPage` | 1 | No |
| 17 | `ScheduleToolbar` | 1 | No |
| 18 | `ClampChat` | 2 | **YES** |
| 19 | `TagPicker` | 1 | No |
| 20 | `CreateClientModals` | 1 | No |

**Only 3 of 20** have responsive styles. The shared primitives (`KpiCard`, `BulkActionBar`, `CustomFieldEditor`, `settingsShared`) have zero responsive handling.

---

## 7. Phase 1 Recommendations (Foundation)

### 7.1 Viewport & Meta
- Add `viewport-fit=cover` for iOS safe areas
- Fix `<title>` to "Scaffld"
- Add `<meta name="theme-color" content="#0C1220">` for mobile browser chrome

### 7.2 Global Layout Shell
- **NotificationPanel**: Make responsive — full-width slide-down or drawer on mobile
- **Search**: Provide mobile search (expand on tap or search icon in header)
- **Sidebar Create popover**: Ensure it doesn't clip in mobile drawer mode
- Consider sticky bottom nav for core actions (Schedule, Jobs, Invoices, Create)

### 7.3 Table Pattern
Create a reusable responsive table wrapper:
- `overflow-x-auto` on all data tables
- On mobile: consider card-based list views instead of tables for the 5 HIGH-risk list pages
- At minimum: wrap all bare `<table>` elements in `<div className="overflow-x-auto">`

### 7.4 Typography
- Body text renders at browser default — verify 16px minimum on mobile
- Touch targets: CLAUDE.md mandates min 44px — audit all buttons, links, and interactive elements

### 7.5 Forms
- Settings inputs use shared `inputCls` from `settingsShared.jsx` — update once, cascades to all 10 tabs
- Form grids use `grid-cols-1 md:grid-cols-2` pattern consistently — this is good
- Verify all inputs have `min-h-[44px]` for touch targets

---

## 8. Phase 2 Recommendations (Core Workflow Screens)

Priority order for field workers:
1. **Jobs list + detail** — most used in the field
2. **Schedule/Calendar** — daily planning
3. **Invoices list + create** — end-of-job billing
4. **Quotes list + create** — on-site quoting
5. **Clients list + detail** — lookups

### Per-screen needs:
- Tables → card list on mobile (or at minimum `overflow-x-auto`)
- Action buttons → 44px min, `flex-wrap` for button groups
- Two-column grids → single column below `md:`
- Calendar month view → horizontal scroll or switch to agenda view on mobile

---

## 9. Phase 3 Recommendations (Polish)

- ClampChat already goes fullscreen on mobile (GOOD)
- Loading/empty states: verify they render nicely in single-column
- Bottom sheet pattern for dropdowns on mobile (status pickers, tag pickers)
- Pull-to-refresh on list views (if time permits)
- Safe area padding for notch/Dynamic Island devices
