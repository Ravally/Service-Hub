# Trellio — Architecture

**Last Updated:** February 12, 2026

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS with Trellio design tokens |
| Backend | Firebase (Firestore, Auth, Storage, Functions) |
| Payments | Stripe |
| State | React Context API + custom hooks |
| Mobile (planned) | Expo SDK 50+ (React Native), WatermelonDB for offline |

## Layered Architecture

```
UI Layer (src/components/)        ← Pure presentation, under 200 lines each
Business Logic (src/hooks/data/)  ← Domain logic, data fetching, mutations
State Management (src/contexts/)  ← Global state (AuthContext, AppStateContext)
Utilities (src/utils/)            ← Shared formatting, calculations, validation
Constants (src/constants/)        ← Status colors, defaults, limits, field types
Data Layer (src/firebase/)        ← Firebase config and initialization
```

## Folder Structure

```
src/
├── App.jsx                  # Root orchestrator (~52 lines)
├── components/
│   ├── AppProviders.jsx     # Context provider wrapper
│   ├── AppContent.jsx       # Main view routing
│   ├── clients/             # Client-related components
│   ├── jobs/                # Job-related components
│   ├── forms/               # Form builder, renderer, checklists
│   ├── timesheets/          # Time tracking components
│   ├── icons/               # SVG icon components
│   └── [Feature]View.jsx    # Detail/list views per domain
├── contexts/
│   ├── AuthContext.jsx       # Auth state & methods
│   └── AppStateContext.jsx   # Collections, settings, UI state
├── hooks/
│   ├── data/                # useClients, useJobs, useQuotes, useInvoices, etc.
│   └── ui/                  # useFormState, useLocalStorage, useAsync, useToggle
├── utils/                   # formatters, calculations, dateUtils, validation
├── constants/               # statusConstants, initialStates, companyDefaults, limits
└── firebase/config.js       # Firebase initialization
```

## Data Flow

```
User Action → Component → Custom Hook → Firebase SDK → Firestore
                                      ↓
                              Context (global state update)
                                      ↓
                              Re-render affected components
```

## Firestore Structure

```
users/{userId}/
├── clients/{clientId}
├── quotes/{quoteId}
├── jobs/{jobId}
├── invoices/{invoiceId}
├── staff/{staffId}
├── quoteTemplates/{templateId}
├── notifications/{notificationId}
└── clientNotes/{noteId}
```

## Key Decisions

- **Firebase over SQL:** Real-time listeners, zero server management, built-in auth
- **Contexts over Redux:** Simpler for current scale, fewer dependencies
- **Custom hooks for data:** `useFirestoreCollection` provides generic CRUD; domain hooks wrap it
- **Tailwind with design tokens:** Brand colors defined in `tailwind.config.js`, referenced via classes

## Supporting Directories

| Directory | Purpose | Modify? |
|-----------|---------|---------|
| `brand/` | Brand spec, design tokens (CSS/JSON), Tailwind config | No (locked) |
| `design/mockups/` | 7 approved HTML mockups — visual reference for UI | No (read-only) |
| `docs/` | Roadmap, conventions, guides, phase tracking | Yes |
| `.claude/skills/` | 5 Claude Code skill definitions | Yes |
| `functions/` | Firebase Cloud Functions (Stripe integration) | Yes |
