# Scaffld - Project Status Report

**Generated**: February 12, 2026
**Branch**: `master` (commit `66c64f6`)
**Build**: Passing (zero errors)

---

## 1. Functional Features & Components

These features are fully built with working UI, data hooks, and Firebase integration.

### Authentication & User Management
| Component | Lines | Description |
|-----------|-------|-------------|
| `Auth.jsx` | 158 | Login/signup form with email+password, error handling |
| `AuthContext.jsx` | 165 | Firebase Auth state, sign-up/sign-in, invite system, profile loading |

- Sign-up, sign-in, sign-out fully functional
- Invite-based onboarding (team members join via invite codes)
- User profile stored in Firestore `users/{uid}`
- **Missing**: Password reset UI, email verification flow, OAuth (Google/Apple)

### Client Management
| Component | Lines | Description |
|-----------|-------|-------------|
| `ClientsList.jsx` | 325 | Client list with search, filters, status badges, KPI cards |
| `CreateClient.jsx` | 612 | Full client creation/edit form (contacts, properties, tags, custom fields) |
| `ClientDetailView.jsx` | 380 | Client detail page with tabs (overview, jobs, quotes, invoices, notes) |
| `clients/Street1Input.jsx` | 128 | Google Places autocomplete for address fields |
| `clients/CreateClientModals.jsx` | 93 | Communication settings, add contact, add property contact modals |

- Full CRUD: create, read, update, delete
- Multi-property support with primary/billing address logic
- Google Places autocomplete for address entry (auto-fills city/state/zip/country/lat/lng)
- Additional contacts per client with communication preferences
- Custom fields, tags, lead source tracking
- Drag-and-drop phone/email reordering
- Client portal link generation
- vCard download
- Client notes system

### Quotes / Estimates
| Component | Lines | Description |
|-----------|-------|-------------|
| `QuotesList.jsx` | 430 | Quote list with status filters, bulk actions (archive, delete), KPI cards |
| `QuoteCreateForm.jsx` | 560 | Full quote builder with line items, optional items, discounts, tax |
| `QuoteDetailView.jsx` | 666 | Quote detail with status workflow, send via email/SMS, deposit collection |
| `QuotePrintView.jsx` | 109 | Print-optimized PDF layout |
| `PublicQuoteApproval.jsx` | 104 | Public page for client to approve/decline a quote |

- Full lifecycle: Draft -> Sent -> Awaiting Approval -> Approved -> Converted -> Archived
- Line items with quantity, unit cost, descriptions
- Optional/required line items
- Discount (% or fixed), tax calculation
- Quote templates (create from template, save as template)
- Email and SMS sending
- Public approval link with token-based access
- Deposit collection and signature capture
- Convert quote to job
- Duplicate/clone quotes
- Bulk archive and bulk delete

### Invoicing
| Component | Lines | Description |
|-----------|-------|-------------|
| `InvoicesList.jsx` | 198 | Invoice list with status filters, KPI cards |
| `InvoiceCreateFlow.jsx` | 276 | Invoice creation wizard (from scratch, from job, or from quote) |
| `InvoiceDetailView.jsx` | 471 | Invoice detail with line items, totals, payment settings, client message |
| `InvoicePrintView.jsx` | 155 | Print-optimized PDF layout |
| `invoices/InvoiceLineItemsCard.jsx` | 66 | Line items editor sub-component |
| `invoices/InvoiceTotalsCard.jsx` | 51 | Totals display sub-component |
| `invoices/InvoiceSidebarCards.jsx` | 111 | Invoice details, client view, payment settings, internal notes cards |

- Full lifecycle: Draft -> Sent -> Unpaid -> Partially Paid -> Paid / Overdue / Void
- Line items with products/services, quantities, unit costs
- Discount and tax calculation
- Payment terms (Net 7/9/14/15/30/60, Due Today, Due on Receipt)
- Client view settings (toggle quantities, unit costs, totals, late stamp)
- Payment settings (card, ACH, partial payments)
- Internal notes and file attachments
- Client message customization
- Stripe payment link generation
- Send via email
- Apply company defaults to new invoices
- Custom fields per invoice

### Job Management
| Component | Lines | Description |
|-----------|-------|-------------|
| `JobsList.jsx` | 253 | Job list with status/assignee filters, search |
| `JobDetailView.jsx` | 98 | Slim orchestrator for job detail (delegates to sub-components) |
| `JobsBoard.jsx` | 162 | Kanban-style board view (Unscheduled, Scheduled, In Progress, Completed) |
| `jobs/JobInfoCard.jsx` | 134 | Job info (client, property, dates, status, assignees) |
| `jobs/JobLineItemsCard.jsx` | 87 | Job line items editor |
| `jobs/JobLabourCard.jsx` | 85 | Labour tracking (hours, rates) |
| `jobs/JobBillingCard.jsx` | 113 | Billing summary and invoice generation |
| `jobs/JobVisitsCard.jsx` | 104 | Visit scheduling and tracking |
| `jobs/JobActivityCards.jsx` | 198 | Activity log, notes, expenses, attachments |
| `jobs/JobChecklistView.jsx` | 256 | Checklist assignment and completion for jobs |
| `jobs/jobDetailUtils.js` | 70 | Shared job detail utility functions |

- Full lifecycle: Unscheduled -> Scheduled -> In Progress -> Completed
- Kanban board and list views
- Assignee management (multi-select from staff)
- Line items, labour tracking, expenses
- Visit scheduling with date/time
- File attachments
- Activity log
- Checklist/form integration
- Create invoice from job
- Job notes

### Scheduling & Calendar
| Component | Lines | Description |
|-----------|-------|-------------|
| `CalendarView.jsx` | 281 | Calendar with day/week/month views, job event display |

- Day, week, and month views
- Shows scheduled jobs with assignee and status
- Click to navigate to job detail
- Date navigation (prev/next/today)

### Timesheets & Time Tracking
| Component | Lines | Description |
|-----------|-------|-------------|
| `timesheets/TimesheetView.jsx` | 612 | Full timesheet management view |
| `timesheets/TimeEntryForm.jsx` | 323 | Time entry creation/edit form |
| `timesheets/ClockInOut.jsx` | 198 | Real-time clock in/out widget |

- Manual time entry with job/client association
- Clock in/out with duration tracking
- Timesheet approval workflow
- Payroll export (CSV)
- Break tracking
- GPS location support (data model ready)

### Forms & Checklists
| Component | Lines | Description |
|-----------|-------|-------------|
| `forms/FormBuilder.jsx` | 374 | Dynamic form template builder |
| `forms/FormFieldEditor.jsx` | 262 | Individual field type editor (14 types) |
| `forms/FormRenderer.jsx` | 375 | Form filling/rendering engine |
| `forms/ChecklistBuilder.jsx` | 326 | Checklist template builder with drag-and-drop |
| `forms/SampleTemplateImporter.jsx` | 182 | Import from 5 industry-specific sample templates |

- 14 field types: text, textarea, number, email, phone, date, time, select, multi-select, checkbox, radio, file upload, photo, signature
- Drag-and-drop field reordering
- Required/optional fields
- Form templates saved to Firestore
- 5 sample templates (Pool Service, HVAC, Pest Control, Property Inspection, Equipment Maintenance)
- Form responses linked to jobs

### Settings
| Component | Lines | Description |
|-----------|-------|-------------|
| `SettingsPage.jsx` | 128 | Settings page router with tab navigation |
| `settings/CompanyBrandingTab.jsx` | 96 | Company name, logo, colors |
| `settings/BillingAccountTab.jsx` | 120 | Stripe connection, payment preferences |
| `settings/InvoiceQuoteSettingsTab.jsx` | 122 | Default invoice/quote settings (terms, tax, numbering) |
| `settings/SchedulingNotificationsTab.jsx` | 122 | Notification preferences, scheduling defaults |
| `settings/IntegrationsPortalTab.jsx` | 137 | Third-party integrations and client portal config |
| `settings/StaffTemplatesTab.jsx` | 80 | Staff management and quote template library |
| `settings/EmailTemplatesTab.jsx` | 49 | Email template customization |
| `settings/settingsShared.jsx` | 16 | Shared UI components for settings tabs |

- 7 settings tabs covering all business configuration
- Company branding (name, logo upload, colors)
- Stripe integration toggle
- Invoice/quote defaults (payment terms, tax rate, numbering prefix)
- Notification preferences
- Client portal settings
- Staff invites
- Quote template management

### Public / Client-Facing Pages
| Component | Lines | Description |
|-----------|-------|-------------|
| `PublicQuoteApproval.jsx` | 104 | Token-based public quote view with approve/decline |
| `PublicClientPortal.jsx` | 491 | Full client self-service portal |

- Public quote approval (no login required, token-based)
- Client portal with:
  - Service request submission
  - Invoice history and payment
  - Quote history
  - Job status tracking
  - Property information
  - Account balance

### Dashboard
| Component | Lines | Description |
|-----------|-------|-------------|
| `DashboardCards.jsx` | 174 | KPI dashboard with client, quote, job, invoice stats |

- 4 dashboard cards (Clients, Quotes, Jobs, Invoices)
- Real-time stats from Firestore data
- Revenue tracking, outstanding amounts
- Quick-action links

### Navigation & Layout
| Component | Lines | Description |
|-----------|-------|-------------|
| `Sidebar.jsx` | 132 | Collapsible sidebar with navigation, notifications badge |
| `AppContent.jsx` | 936 | Main view router (all view switching logic) |
| `AppProviders.jsx` | 17 | Context provider wrapper |
| `App.jsx` | 52 | Root orchestrator |

### Shared / Reusable Components
| Component | Lines | Description |
|-----------|-------|-------------|
| `common/KpiCard.jsx` | 24 | Reusable KPI metric card |
| `common/Pill.jsx` | 9 | Status pill/badge component |
| `common/Chip.jsx` | 12 | Tag chip component |
| `clientPortal/ServiceRequestModal.jsx` | 168 | Service request form modal |
| `PropertyDetailView.jsx` | 314 | Property detail with jobs, quotes, invoices |

### Icons (27 components)
All SVG icon components in `components/icons/`, including Scaffld brand logo variants.

---

## 2. Partially Built Features

### Password Reset & Email Verification
- **Status**: Auth context has sign-up/sign-in but no password reset or email verification UI
- **What exists**: Firebase Auth supports these natively; just needs UI components
- **Missing**: `ForgotPassword.jsx`, email verification prompt after sign-up

### Notifications
- **Status**: Data model exists, notification count badge shows in sidebar
- **What exists**: `notifications` collection subscribed in `useFirebaseSubscriptions.js`, `handleMarkNotificationAsRead` handler, unread count in sidebar badge
- **Missing**: Full notifications panel/dropdown UI, notification creation triggers (currently no component renders the notification list)

### Staff Management
- **Status**: Basic staff invite and list in Settings tab
- **What exists**: Staff collection in Firestore, invite flow, assignee selection in jobs, staff list in `StaffTemplatesTab`
- **Missing**: Dedicated staff management page, role/permission system, individual staff profiles, staff scheduling view

### Reports & Analytics
- **Status**: Dashboard has basic KPI cards only
- **What exists**: `DashboardCards.jsx` with summary stats, `computeTotals` and `calculateJobProfitability` in utils
- **Missing**: Dedicated reports page, charts/graphs, date-range filtering, export to PDF/CSV, revenue trends, job profitability reports

### SMS Messaging
- **Status**: Utility helpers exist but no UI integration
- **What exists**: `utils/smsHelpers.js` (167 lines) with message formatting functions
- **Missing**: SMS sending UI, SMS provider integration (Twilio/etc.), conversation view

### PDF Generation
- **Status**: Print views exist, utility helpers exist
- **What exists**: `InvoicePrintView.jsx`, `QuotePrintView.jsx`, `utils/pdfGenerator.js` (209 lines)
- **Missing**: Server-side PDF generation (currently browser print only), email-as-PDF attachment

### Payroll Export
- **Status**: Utility exists, connected to timesheets
- **What exists**: `utils/payrollExport.js` (411 lines) with CSV generation
- **Missing**: Multiple export formats, payroll provider integrations

---

## 3. Roadmap Items Not Started

Based on `docs/ROADMAP.md`, these features are planned but have **no code written**:

### Phase 2.1: Mobile App (Q1 2026 - In Progress per roadmap, but no mobile code in this repo)
- Expo (React Native) setup
- Mobile authentication & job management
- Time tracking with GPS on mobile
- Forms & checklists on mobile
- Offline sync (WatermelonDB)
- Push notifications (mobile)

### Phase 2.2: GPS Tracking & Route Optimization (Q1 2026)
- GPS waypoint logging
- Route optimization algorithm
- Map visualization (beyond current lat/lng storage)
- Navigation integration (Google Maps/Waze deep links)

### Phase 3: Sales & Marketing (Q2 2026)
- Online booking system (public booking page)
- Review management (request, track, respond to reviews)
- Email marketing campaigns (bulk email, templates, tracking)
- Deposit collection enhancements

### Phase 4: Advanced Operations (Q3 2026)
- Advanced reporting & analytics dashboards
- Job costing & profitability analysis
- Team permissions & role-based access control
- Batch operations (bulk invoice, bulk job updates)

### Phase 5: Integrations & Polish (Q3 2026)
- QuickBooks integration
- Xero integration
- Payment plans (installment billing)
- Client segmentation (automated grouping)

### AI Enhancement Phases (Q4 2026)
- Intelligent job scheduling (AI-optimized)
- Churn prediction & prevention
- Automated quote generation
- Client portal AI assistant
- Revenue forecasting
- Anomaly detection
- Voice-to-text job notes
- Automatic photo organization

---

## 4. Current Folder Structure

```
service-hub-app/
├── brand/                          # Scaffld brand assets and guidelines
├── docs/                           # Project documentation
│   ├── ARCHITECTURE.md             # Technical architecture patterns
│   ├── CONVENTIONS.md              # Coding standards and conventions
│   ├── ROADMAP.md                  # Master product roadmap
│   ├── archive/                    # Archived documentation from prior phases
│   ├── guides/                     # Setup and deployment guides
│   └── phases/                     # Detailed phase documentation
├── public/                         # Static assets served by Vite
├── src/
│   ├── App.jsx                     # Root orchestrator (52 lines)
│   ├── main.jsx                    # Vite entry point (10 lines)
│   ├── index.css                   # Global styles + Tailwind directives
│   ├── components/                 # All React UI components
│   │   ├── AppContent.jsx          # Main view router (936 lines)
│   │   ├── AppProviders.jsx        # Context provider wrapper
│   │   ├── Auth.jsx                # Login/signup form
│   │   ├── Sidebar.jsx             # Navigation sidebar
│   │   ├── DashboardCards.jsx      # Dashboard KPI cards
│   │   ├── CalendarView.jsx        # Calendar scheduling view
│   │   ├── ClientsList.jsx         # Client list page
│   │   ├── CreateClient.jsx        # Client create/edit form
│   │   ├── ClientDetailView.jsx    # Client detail page
│   │   ├── QuotesList.jsx          # Quotes list page
│   │   ├── QuoteCreateForm.jsx     # Quote builder
│   │   ├── QuoteDetailView.jsx     # Quote detail page
│   │   ├── QuotePrintView.jsx      # Quote print layout
│   │   ├── InvoicesList.jsx        # Invoices list page
│   │   ├── InvoiceCreateFlow.jsx   # Invoice creation wizard
│   │   ├── InvoiceDetailView.jsx   # Invoice detail page
│   │   ├── InvoicePrintView.jsx    # Invoice print layout
│   │   ├── JobsList.jsx            # Jobs list page
│   │   ├── JobDetailView.jsx       # Job detail orchestrator
│   │   ├── JobsBoard.jsx           # Kanban board view
│   │   ├── PropertyDetailView.jsx  # Property detail page
│   │   ├── PublicQuoteApproval.jsx # Public quote approval page
│   │   ├── PublicClientPortal.jsx  # Client self-service portal
│   │   ├── SettingsPage.jsx        # Settings page router
│   │   ├── clients/                # Client sub-components (Street1Input, modals)
│   │   ├── clientPortal/           # Client portal sub-components
│   │   ├── common/                 # Reusable UI (KpiCard, Pill, Chip)
│   │   ├── forms/                  # Form builder, renderer, checklists
│   │   ├── icons/                  # 27 SVG icon components + Scaffld logos
│   │   ├── invoices/               # Invoice sub-components (line items, totals, sidebar)
│   │   ├── jobs/                   # Job sub-components (6 cards + utils)
│   │   ├── settings/               # 7 settings tab components
│   │   └── timesheets/             # Timesheet, time entry, clock in/out
│   ├── constants/                  # Application constants
│   │   ├── index.js                # Barrel export
│   │   ├── companyDefaults.js      # Default company settings (136 lines)
│   │   ├── formFieldTypes.js       # 14 form field type definitions (240 lines)
│   │   ├── initialStates.js        # Initial state objects for all entities (150 lines)
│   │   ├── invoiceDefaults.js      # Invoice/quote default settings (41 lines)
│   │   ├── limits.js               # Business rule constraints (34 lines)
│   │   ├── sampleTemplates.js      # 5 industry sample form templates (664 lines)
│   │   └── statusConstants.js      # Status definitions and color mappings (70 lines)
│   ├── contexts/                   # React context providers
│   │   ├── index.js                # Barrel export
│   │   ├── AuthContext.jsx         # Auth state (sign-up, sign-in, profile) (165 lines)
│   │   └── AppStateContext.jsx     # App state (all collections, filters, navigation) (221 lines)
│   ├── firebase/                   # Firebase configuration
│   │   └── config.js               # Firebase app initialization (25 lines)
│   ├── hooks/                      # Custom React hooks
│   │   ├── index.js                # Barrel export
│   │   ├── business/               # Business logic hooks (empty - reserved)
│   │   ├── data/                   # Data fetching and mutation hooks
│   │   │   ├── index.js            # Barrel export
│   │   │   ├── useAppHandlers.js   # Handler orchestrator (202 lines)
│   │   │   ├── clientHandlers.js   # Client CRUD handlers (213 lines)
│   │   │   ├── quoteHandlers.js    # Quote lifecycle handlers (432 lines)
│   │   │   ├── jobHandlers.js      # Job CRUD handlers (119 lines)
│   │   │   ├── invoiceHandlers.js  # Invoice lifecycle handlers (246 lines)
│   │   │   ├── settingsHandlers.js # Settings save handlers (273 lines)
│   │   │   ├── handlerUtils.js     # Shared handler utilities (147 lines)
│   │   │   ├── useClients.js       # Client data hook (63 lines)
│   │   │   ├── useQuotes.js        # Quote data hook (57 lines)
│   │   │   ├── useJobs.js          # Job data hook (64 lines)
│   │   │   ├── useInvoices.js      # Invoice data hook (90 lines)
│   │   │   ├── useFirestore.js     # Generic Firestore CRUD (79 lines)
│   │   │   ├── useFirebaseSubscriptions.js # Real-time listeners (92 lines)
│   │   │   ├── useFormTemplates.js # Form template CRUD (186 lines)
│   │   │   ├── useFormResponses.js # Form response management (211 lines)
│   │   │   ├── useTimeTracking.js  # Time entry CRUD (306 lines)
│   │   │   └── usePublicAccess.js  # Public token access handling (131 lines)
│   │   └── ui/                     # UI state hooks
│   │       ├── index.js            # Barrel export
│   │       ├── useAsync.js         # Async operation state (46 lines)
│   │       ├── useFormState.js     # Form state with validation (101 lines)
│   │       ├── useLocalStorage.js  # Persistent localStorage state (31 lines)
│   │       └── useToggle.js        # Boolean toggle helper (24 lines)
│   └── utils/                      # Utility functions
│       ├── index.js                # Barrel export
│       ├── calculations.js         # Business math (totals, profitability, due dates) (145 lines)
│       ├── dateUtils.js            # Date formatting and manipulation (179 lines)
│       ├── formatters.js           # Currency, date, phone formatting (86 lines)
│       ├── payrollExport.js        # Payroll CSV generation (411 lines)
│       ├── pdfGenerator.js         # PDF generation utilities (209 lines)
│       ├── smsHelpers.js           # SMS message formatting (167 lines)
│       ├── textUtils.js            # Text transformation utilities (124 lines)
│       └── validation.js           # Input validation functions (115 lines)
├── tailwind.config.js              # Tailwind config with Scaffld brand tokens
├── vite.config.js                  # Vite build configuration
├── package.json                    # Dependencies and scripts
├── CLAUDE.md                       # Project guide for AI assistance
└── firebase.json                   # Firebase hosting/functions config
```

---

## 5. Code Quality Summary

### Recent Refactoring (Feb 12, 2026)
- **useAppHandlers.js**: 1,335 -> 202 lines (split into 7 domain-specific handler modules)
- **SettingsPage.jsx**: 799 -> 128 lines (split into 7 tab components)
- **JobDetailView.jsx**: 1,171 -> 98 lines (split into 6 card components + utils)
- **CreateClient.jsx**: 822 -> 612 lines (extracted Street1Input + 3 modals)
- **InvoiceDetailView.jsx**: 856 -> 471 lines (extracted line items, totals, sidebar cards)
- **Brand compliance**: 348 gray->brand token replacements across 22 files
- **Zero TODO/FIXME/HACK comments** in codebase

### Files Over 200 Lines (components)
| File | Lines | Notes |
|------|-------|-------|
| `AppContent.jsx` | 936 | View router - large but structural |
| `QuoteDetailView.jsx` | 666 | Complex quote workflow |
| `CreateClient.jsx` | 612 | Multi-section form |
| `TimesheetView.jsx` | 612 | Full timesheet management |
| `QuoteCreateForm.jsx` | 560 | Quote builder with line items |
| `PublicClientPortal.jsx` | 491 | Full client portal |
| `InvoiceDetailView.jsx` | 471 | Invoice detail with sidebar |
| `QuotesList.jsx` | 430 | Quote list with bulk actions |
| `FormBuilder.jsx` | 374 | Dynamic form builder |
| `FormRenderer.jsx` | 375 | Form rendering engine |
| `ClientDetailView.jsx` | 380 | Client detail with tabs |
| `ChecklistBuilder.jsx` | 326 | Checklist builder |
| `ClientsList.jsx` | 325 | Client list |
| `TimeEntryForm.jsx` | 323 | Time entry form |
| `PropertyDetailView.jsx` | 314 | Property detail |
| `CalendarView.jsx` | 281 | Calendar view |
| `InvoiceCreateFlow.jsx` | 276 | Invoice creation |
| `FormFieldEditor.jsx` | 262 | Field type editor |
| `JobChecklistView.jsx` | 256 | Job checklist view |
| `JobsList.jsx` | 253 | Jobs list |

### Total Source Files
- **Components**: 67 files (including icons)
- **Hooks**: 19 files
- **Utils**: 8 files
- **Constants**: 8 files
- **Contexts**: 3 files
- **Firebase**: 1 file
- **Total**: ~106 source files

---

## 6. Tech Debt & Recommendations

1. **AppContent.jsx (936 lines)** - Largest file; consider route-based code splitting with React.lazy
2. **Notifications UI** - Data model exists but no notification panel component
3. **Password reset** - Needs a simple `ForgotPassword.jsx` component
4. **Test coverage** - No test files exist; unit tests for utils and hooks recommended
5. **hooks/business/** - Empty directory reserved for future business logic hooks
6. **Print views** - Intentionally use gray classes for white-paper rendering (not a bug)

---

*Report generated during Scaffld codebase refactor, Phase 3D verification.*
