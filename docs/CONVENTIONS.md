# Trellio — Coding Conventions

**Last Updated:** February 12, 2026

## File Naming

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase `.jsx` | `ClientDetailView.jsx` |
| Hooks | camelCase with `use` prefix | `useClients.js` |
| Utils | camelCase | `formatters.js` |
| Constants | camelCase | `statusConstants.js` |

## Import Order

```javascript
// 1. React/framework
import React, { useState, useEffect } from 'react';
// 2. Contexts
import { useAuth } from '../contexts/AuthContext';
import { useAppState } from '../contexts/AppStateContext';
// 3. Hooks
import { useClients } from '../hooks/data';
// 4. Utils & constants
import { formatCurrency, formatDate } from '../utils';
import { STATUS_COLORS } from '../constants';
// 5. Components
import ClientCard from './ClientCard';
```

## Component Template

```jsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils';

export default function FeatureCard({ item, onAction }) {
  // hooks first, then derived state, then handlers, then render
  return (
    <div className="bg-charcoal rounded-xl border border-slate-700/30">
      {/* content */}
    </div>
  );
}
```

## Brand Usage

- **Primary actions:** `btn-primary` (trellio-teal)
- **Secondary actions:** `btn-secondary` (charcoal/slate)
- **Destructive actions:** `btn-accent-coral` (signal-coral)
- **Backgrounds:** `bg-midnight` (page), `bg-charcoal` (cards)
- **Text:** `text-slate-100` (primary), `text-slate-400` (secondary)
- **Borders:** `border-slate-700/30`
- **Inputs:** `bg-midnight border-slate-700 focus:border-trellio-teal`

## Error Handling

Always wrap async operations: `try { await op(); showToast('OK','success'); } catch(e) { showToast(e.message,'error'); }`

## Don'ts

1. Don't duplicate utilities — import from `src/utils/`
2. Don't create god components — keep under 200 lines
3. Don't prop drill — use contexts for shared state
4. Don't write Firestore queries in components — use data hooks
5. Don't hardcode values — use `src/constants/`
6. Don't use `bg-gray-*` — use `bg-midnight`/`bg-charcoal`/`text-slate-*`
7. Don't use hardcoded hex colors — use Tailwind brand classes
8. Don't skip error handling — always try/catch with user feedback
9. Don't mix concerns — UI in components, logic in hooks, state in contexts

## Git

- **Branches:** `feature/name`, `fix/name`, `refactor/name`, `docs/name`
- **Commits:** `feat:`, `fix:`, `refactor:`, `docs:` (conventional commits)
- **Before committing:** `npm run lint` + `npm run build` must pass
