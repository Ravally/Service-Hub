---
name: trellio-component
description: "Create React UI components for Trellio following brand guidelines, design tokens, and project conventions. Use when: building pages, forms, cards, modals, dashboards, tables, navigation, or any user-facing UI. Triggers: 'create a component', 'build a page', 'add a form', 'new section', 'UI for', or any request involving visual elements, layouts, or interactive features."
---

# Trellio Component Generator

## Overview

Generate production-ready React components for Trellio — a field service management platform for home service businesses. Every component must be field-ready: usable in sunlight, with gloves, on a moving truck.

## Tech Stack

- **Framework:** React 18+ with Vite
- **Language:** JavaScript (JSX) — NOT TypeScript
- **Styling:** Tailwind CSS with custom Trellio theme
- **State:** React hooks + Context (AuthContext, AppStateContext)
- **Data:** Firebase/Firestore via custom hooks (useClients, useJobs, etc.)
- **Icons:** Custom SVG components in `components/icons/`

## Brand Tokens (Required)

Use Tailwind classes from `tailwind.config.js`. Never hardcode hex values.

| Token | Tailwind Class | Hex | Usage |
|-------|---------------|-----|-------|
| Trellio Teal | `trellio-teal` | #0EA5A0 | Primary CTAs, links, brand identity |
| Deep Teal | `trellio-teal-dark` | #087F7A | Hover states, active, depth |
| Frost Mint | `trellio-mint` | #B2F0ED | Success, light backgrounds, tags |
| Signal Coral | `trellio-coral` | #F7845E | Alerts, urgency, accent |
| Harvest Amber | `trellio-amber` | #FFAA5C | Warnings, highlights, secondary accent |
| Midnight | `trellio-midnight` | #0C1220 | Dark backgrounds, nav |
| Charcoal | `trellio-charcoal` | #1A2332 | Cards on dark, secondary surfaces |
| Warm Cream | `trellio-cream` | #FFF9F5 | Light page backgrounds |
| Field Gray | `trellio-gray` | #6B7280 | Secondary text, borders |

## File Structure (Match Existing)

```
src/
├── components/
│   ├── AppContent.jsx          # Main view router (all view switching)
│   ├── Auth.jsx                # Login/signup
│   ├── Sidebar.jsx             # Navigation sidebar
│   ├── DashboardCards.jsx      # Dashboard KPI cards
│   ├── CalendarView.jsx        # Scheduling calendar
│   ├── [Feature]List.jsx       # List views (ClientsList, JobsList, etc.)
│   ├── [Feature]DetailView.jsx # Detail views
│   ├── [Feature]CreateForm.jsx # Creation forms
│   ├── common/                 # Reusable primitives (KpiCard, Pill, Chip)
│   ├── icons/                  # SVG icon components + Trellio logos
│   ├── clients/                # Client sub-components
│   ├── jobs/                   # Job sub-components (6 cards + utils)
│   ├── invoices/               # Invoice sub-components
│   ├── forms/                  # Form builder, renderer, checklists
│   ├── settings/               # Settings tab components
│   ├── timesheets/             # Timesheet components
│   └── clientPortal/           # Client portal sub-components
├── hooks/
│   ├── data/                   # Firestore CRUD hooks (useClients, useJobs, etc.)
│   ├── ui/                     # UI state hooks (useAsync, useFormState, useToggle)
│   └── business/               # Business logic hooks (reserved)
├── contexts/
│   ├── AuthContext.jsx          # Firebase Auth state
│   └── AppStateContext.jsx      # App state (collections, filters, navigation)
├── constants/                   # Status definitions, defaults, field types, limits
└── utils/                       # Calculations, formatting, date, validation, PDF, SMS
```

## Component Template

Every component must follow this pattern (matches existing codebase):

```jsx
// src/components/[feature]/ComponentName.jsx
import { useState, useEffect } from 'react';
// Group imports: React → Firebase → hooks → components → constants → utils

/**
 * Brief description of what this component does.
 * Used in: [where this component appears in AppContent.jsx]
 */
export default function ComponentName({ /* props */ }) {
  // State
  // Effects
  // Handlers
  // Render
  return (
    <div className="...">
      {/* Component JSX */}
    </div>
  );
}
```

**IMPORTANT:** The existing codebase uses `export default function` — follow this pattern, NOT named exports.

## Data Patterns (Firestore)

### Reading data — use existing hooks:
```jsx
import { useClients } from '../hooks/data/useClients';
import { useJobs } from '../hooks/data/useJobs';
import { useInvoices } from '../hooks/data/useInvoices';
import { useQuotes } from '../hooks/data/useQuotes';

// In component:
const { clients, loading } = useClients(companyId);
```

### Writing data — use existing handlers via AppStateContext:
```jsx
import { useAppState } from '../contexts/AppStateContext';

function MyComponent() {
  const { handlers } = useAppState();
  
  const handleSave = async () => {
    await handlers.handleSaveClient(clientData);
  };
}
```

### Firestore direct (for new collections):
```jsx
import { collection, addDoc, updateDoc, doc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

// Real-time listener
useEffect(() => {
  const q = query(
    collection(db, 'companies', companyId, '[collection]'),
    where('status', '==', 'active')
  );
  const unsub = onSnapshot(q, (snap) => {
    setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
  return unsub;
}, [companyId]);
```

## View Integration

New views are added to `AppContent.jsx` via the view routing pattern:
```jsx
// In AppContent.jsx's render switch:
{currentView === 'newFeature' && <NewFeatureView />}
```

Navigation is triggered via AppStateContext:
```jsx
const { setCurrentView } = useAppState();
setCurrentView('newFeature');
```

## Rules

### Accessibility & Field-Readiness
- **Minimum touch target:** 44x44px (48x48px preferred for field use)
- **Minimum font size:** 16px body, 14px captions (no smaller)
- **Contrast ratio:** 4.5:1 minimum for all text
- **Forms:** Always associate labels with inputs, show inline validation
- **Loading states:** Always show loading indicator — never leave users guessing

### Responsive Design
- **Mobile-first:** Write mobile styles first, then `md:` and `lg:` breakpoints
- **Sidebar:** Collapsible on mobile → persistent on `lg:`
- **Tables:** Horizontal scroll on mobile, or convert to card layout

### Naming & Patterns
- **Files:** PascalCase matching component name: `JobCard.jsx`
- **Default exports:** `export default function ComponentName`
- **Hooks:** `use` prefix: `useJobs`, `useSchedule`
- **Handlers:** `handle` prefix: `handleSave`, `handleDelete`
- **Sub-components:** Feature folder: `jobs/JobInfoCard.jsx`

### Status & Lifecycle Patterns
Use constants from `src/constants/statusConstants.js`:
```jsx
import { JOB_STATUSES, INVOICE_STATUSES, QUOTE_STATUSES } from '../constants/statusConstants';
```

### Do NOT
- Use TypeScript — this project is JavaScript (JSX)
- Use inline styles — always Tailwind classes
- Hardcode colors — always use Trellio theme tokens
- Create files longer than 250 lines — split into sub-components
- Skip loading/error/empty states
- Import from Next.js (no next/link, next/image, etc.)
- Use Server Components or "use client" directives — this is not Next.js

## Checklist Before Finishing

- [ ] JavaScript (JSX), not TypeScript
- [ ] Default export with function declaration
- [ ] All interactive elements have 44px+ touch targets
- [ ] Loading and empty states handled
- [ ] Responsive: mobile-first with md: and lg: breakpoints
- [ ] Brand tokens used — no hardcoded hex colors
- [ ] File under 250 lines (split into sub-components if needed)
- [ ] Data accessed via existing hooks/handlers, not raw Firestore calls (unless new collection)
- [ ] View registered in AppContent.jsx if it's a new page
