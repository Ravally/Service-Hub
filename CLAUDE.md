# Service Hub - Project Guide

## Project Overview

Service Hub is a comprehensive business management application built with React, Firebase, and Tailwind CSS. It provides tools for managing clients, jobs, quotes, invoices, scheduling, and more.

**Tech Stack**:
- React 18 with Vite
- Firebase (Firestore, Auth, Storage, Functions)
- Tailwind CSS
- Stripe for payments

---

## Architecture

This codebase follows a **clean, modular architecture** with clear separation of concerns.

### Key Principles

1. **Single Responsibility** - Each module has one clear purpose
2. **DRY (Don't Repeat Yourself)** - Utilities are centralized, zero duplication
3. **Separation of Concerns** - State, logic, and UI are separated
4. **Composition** - Hooks and contexts are composed for complex functionality

---

## Directory Structure

```
src/
├── App.jsx                      # 52-line root orchestrator
├── components/
│   ├── AppProviders.jsx         # Context provider wrapper
│   ├── AppContent.jsx           # Main view routing
│   ├── clients/                 # Client-related components
│   ├── quotes/                  # Quote-related components
│   ├── jobs/                    # Job-related components
│   ├── invoices/                # Invoice-related components
│   ├── common/                  # Reusable UI components
│   └── icons/                   # SVG icon components
├── contexts/
│   ├── AuthContext.jsx          # Authentication state & methods
│   └── AppStateContext.jsx      # Application state management
├── hooks/
│   ├── data/                    # Data fetching and mutations
│   │   ├── useFirestore.js      # Generic Firestore CRUD
│   │   ├── useClients.js        # Client operations
│   │   ├── useQuotes.js         # Quote operations
│   │   ├── useJobs.js           # Job operations
│   │   ├── useInvoices.js       # Invoice operations
│   │   ├── useFirebaseSubscriptions.js  # Real-time listeners
│   │   ├── usePublicAccess.js   # Public access handling
│   │   └── useAppHandlers.js    # Business logic handlers
│   └── ui/                      # UI state management
│       ├── useFormState.js      # Form state with validation
│       ├── useLocalStorage.js   # Persistent state
│       ├── useAsync.js          # Async operation state
│       └── useToggle.js         # Boolean toggle state
├── utils/
│   ├── formatters.js            # Currency, date, phone formatting
│   ├── calculations.js          # Business calculations
│   ├── dateUtils.js             # Date manipulation
│   ├── textUtils.js             # Text transformation
│   └── validation.js            # Input validation
├── constants/
│   ├── statusConstants.js       # Status definitions and colors
│   ├── initialStates.js         # Initial state objects
│   ├── companyDefaults.js       # Company default settings
│   ├── invoiceDefaults.js       # Invoice/quote defaults
│   └── limits.js                # Business rule constraints
└── firebase/
    └── config.js                # Firebase initialization
```

---

## Coding Conventions

### Imports

Always use centralized utilities and constants:

```javascript
// ✅ Good
import { formatCurrency, formatDate } from '../utils';
import { STATUS_COLORS } from '../constants';
import { useClients } from '../hooks/data';

// ❌ Bad - Don't create local utility functions
const currency = (n) => `$${n.toFixed(2)}`;  // NO!
```

### State Management

Use contexts for global state, local state for component-specific needs:

```javascript
// ✅ Good - Use contexts
import { useAuth } from '../contexts/AuthContext';
import { useAppState } from '../contexts/AppStateContext';

function MyComponent() {
  const { userId } = useAuth();
  const { clients, setClients } = useAppState();
  // ...
}

// ❌ Bad - Don't prop drill through many levels
<Component1 userId={userId} clients={clients} />
```

### Data Fetching

Use the custom data hooks:

```javascript
// ✅ Good - Use data hooks
import { useClients } from '../hooks/data';

function ClientList() {
  const { clients, loading, addClient, updateClient } = useClients();
  // ...
}

// ❌ Bad - Don't write Firebase queries directly in components
const [clients, setClients] = useState([]);
useEffect(() => {
  const unsubscribe = onSnapshot(collection(db, 'clients'), ...);
  // ...
}, []);
```

### Component Structure

Keep components focused and under 200 lines:

```javascript
// ✅ Good - Focused component
function ClientCard({ client, onEdit }) {
  return (
    <div className="card">
      <h3>{client.name}</h3>
      <button onClick={() => onEdit(client)}>Edit</button>
    </div>
  );
}

// ❌ Bad - God component with multiple responsibilities
function ClientManagement() {
  // 500 lines of mixed concerns...
}
```

### File Naming

- **Components**: PascalCase - `ClientDetailView.jsx`
- **Hooks**: camelCase with 'use' prefix - `useClients.js`
- **Utils**: camelCase - `formatters.js`
- **Constants**: camelCase - `statusConstants.js`

---

## Common Tasks

### Adding a New Utility Function

1. Add to appropriate file in `src/utils/`
2. Export from that file
3. Import where needed

```javascript
// src/utils/formatters.js
export function formatPhoneNumber(phone) {
  // implementation
}

// In component
import { formatPhoneNumber } from '../utils';
```

### Adding a New Constant

1. Add to appropriate file in `src/constants/`
2. Export from that file
3. Import where needed

```javascript
// src/constants/limits.js
export const MAX_ATTACHMENTS = 10;

// In component
import { MAX_ATTACHMENTS } from '../constants';
```

### Adding a New Data Hook

1. Create in `src/hooks/data/`
2. Export from `src/hooks/data/index.js`
3. Use in components

```javascript
// src/hooks/data/useProducts.js
export function useProducts() {
  const { userId } = useAuth();
  const { data, loading, error, add, update, remove } =
    useFirestoreCollection(userId, 'products');

  return {
    products: data,
    loading,
    error,
    addProduct: add,
    updateProduct: update,
    deleteProduct: remove,
  };
}

// src/hooks/data/index.js
export { useProducts } from './useProducts';
```

### Creating a New Component

1. Keep it focused (one responsibility)
2. Use existing hooks and contexts
3. Import utilities from centralized modules
4. Keep under 200 lines

```javascript
import React from 'react';
import { formatCurrency, formatDate } from '../utils';
import { useClients } from '../hooks/data';

export default function ClientInvoicesSummary({ clientId }) {
  const { getClientById } = useClients();
  const client = getClientById(clientId);

  return (
    <div>
      <h2>{client.name}</h2>
      {/* Component content */}
    </div>
  );
}
```

---

## Important Patterns

### Context Pattern

All contexts follow this pattern:

```javascript
import React, { createContext, useContext, useState } from 'react';

const MyContext = createContext(null);

export function useMyContext() {
  const context = useContext(MyContext);
  if (!context) {
    throw new Error('useMyContext must be used within MyProvider');
  }
  return context;
}

export function MyProvider({ children }) {
  const [state, setState] = useState(initialState);

  const value = {
    state,
    setState,
    // ... other state and methods
  };

  return <MyContext.Provider value={value}>{children}</MyContext.Provider>;
}
```

### Custom Hook Pattern

```javascript
export function useCustomHook() {
  const [state, setState] = useState();

  // Business logic here

  return {
    // Public API
    data: state,
    loading,
    error,
    actions: { add, update, remove }
  };
}
```

### Firestore Operations

Always use the centralized `useFirestoreCollection` hook:

```javascript
const { data, loading, error, add, update, remove } =
  useFirestoreCollection(userId, 'collectionName');
```

---

## Firebase Structure

```
firestore/
├── users/{userId}
│   ├── clients/{clientId}
│   ├── quotes/{quoteId}
│   ├── jobs/{jobId}
│   ├── invoices/{invoiceId}
│   ├── staff/{staffId}
│   ├── quoteTemplates/{templateId}
│   ├── notifications/{notificationId}
│   └── clientNotes/{noteId}
├── invites/{inviteId}
└── public/
    └── quotes/{quoteId}  # For public access
```

---

## Status Colors

Use centralized `STATUS_COLORS` from `src/constants/statusConstants.js`:

```javascript
import { STATUS_COLORS } from '../constants';

<div className={STATUS_COLORS[status]}>
  {status}
</div>
```

Available statuses:
- **Quotes**: Draft, Sent, Awaiting Approval, Approved, Converted, Archived
- **Invoices**: Draft, Sent, Unpaid, Partially Paid, Paid, Overdue, Void
- **Jobs**: Unscheduled, Scheduled, In Progress, Completed
- **Clients**: Active, Inactive, Lead

---

## Calculations

All business calculations are in `src/utils/calculations.js`:

- `computeTotals(doc)` - Calculate quote/invoice totals with discounts and tax
- `calculateJobProfitability(job)` - Calculate job profit margins
- `computeDueDate(issueDate, term)` - Calculate due dates from payment terms
- `calculateInvoiceBalance(invoice)` - Calculate outstanding balance

---

## Testing Guidelines

When writing tests:

1. **Utilities**: Unit test each function
2. **Hooks**: Use React Testing Library's `renderHook`
3. **Components**: Test user interactions and rendering
4. **Integration**: Test complete user flows

---

## Performance Tips

1. **Memoization**: Use `useMemo` for expensive calculations
2. **Callbacks**: Use `useCallback` for functions passed to children
3. **Code Splitting**: Use React.lazy for large components
4. **Firestore**: Use indexes for complex queries

---

## Common Pitfalls to Avoid

### ❌ Don't

1. **Don't duplicate utilities** - Always import from `src/utils`
2. **Don't create god components** - Keep under 200 lines
3. **Don't prop drill** - Use contexts for global state
4. **Don't write Firebase queries directly** - Use data hooks
5. **Don't hardcode values** - Use constants from `src/constants`
6. **Don't mix concerns** - Separate UI, logic, and data
7. **Don't forget error handling** - Always handle errors gracefully

### ✅ Do

1. **Do use centralized utilities** - Import from `src/utils`
2. **Do keep components focused** - One responsibility per component
3. **Do use contexts** - For global state management
4. **Do use custom hooks** - For reusable logic
5. **Do use constants** - From `src/constants`
6. **Do separate concerns** - UI in components, logic in hooks
7. **Do handle errors** - Try/catch and user feedback

---

## Git Workflow

### Branch Naming

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation updates

### Commit Messages

Follow conventional commits:

```
feat: add client export functionality
fix: resolve invoice calculation bug
refactor: extract payment utilities
docs: update API documentation
```

---

## Environment Variables

Required in `.env`:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key
```

---

## Build & Deploy

```bash
# Development
npm run dev

# Build
npm run build

# Preview build
npm run preview

# Deploy (Firebase)
firebase deploy
```

---

## Additional Resources

- **[AUDIT.md](AUDIT.md)** - Initial audit findings
- **[REFACTORING-SUMMARY.md](REFACTORING-SUMMARY.md)** - Complete refactoring details
- Firebase Docs: https://firebase.google.com/docs
- React Docs: https://react.dev
- Tailwind Docs: https://tailwindcss.com

---

## Questions?

This codebase follows best practices for:
- Clean architecture
- Separation of concerns
- DRY principles
- Testability
- Maintainability
- Performance

When in doubt, look at existing patterns in similar files and follow the same approach.

**Happy coding! 🚀**
