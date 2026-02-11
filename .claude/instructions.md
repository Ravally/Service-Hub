# Trellio - Claude Code Instructions

**Auto-Loaded Project Context**

---

## Project Overview

**Trellio** is a Jobber-level field service management platform built with React 18, Firebase, and Tailwind CSS. The codebase has been completely refactored from a monolithic 2,718-line App.jsx to a clean, modular architecture with zero duplicate code.

**Current Status**:
- ✅ Phase 1: Client Hub & Security (Complete)
- ✅ Phase 2.3: Forms & Checklists (Complete)
- 🚧 Phase 2.1-2.2: Mobile App Development (In Progress)

---

## Critical Documentation

**READ THESE FIRST** when starting any task:

1. **[docs/TRELLIO_ARCHITECTURE.md](docs/TRELLIO_ARCHITECTURE.md)** - Architecture, patterns, conventions
2. **[docs/TRELLIO_MASTER_ROADMAP.md](docs/TRELLIO_MASTER_ROADMAP.md)** - Product roadmap & timeline
3. **[docs/phases/PHASE_2_IN_PROGRESS.md](docs/phases/PHASE_2_IN_PROGRESS.md)** - Current work details

**Setup & Development**:
- **[docs/guides/SETUP.md](docs/guides/SETUP.md)** - Development environment setup
- **[docs/guides/DEPLOYMENT.md](docs/guides/DEPLOYMENT.md)** - Build & deployment process

**Brand & Design**:
- **[brand/TRELLIO_BRAND.md](brand/TRELLIO_BRAND.md)** - Complete brand system (colors, fonts, voice)

---

## Key Architectural Principles

### 1. **DRY (Don't Repeat Yourself)**
- ❌ **NEVER** create local utility functions
- ✅ **ALWAYS** import from `src/utils/`
- ✅ **ALWAYS** import constants from `src/constants/`

```javascript
// ✅ Good
import { formatCurrency, formatDate } from '../utils';
import { STATUS_COLORS } from '../constants';

// ❌ Bad - DON'T DO THIS
const formatCurrency = (n) => `$${n.toFixed(2)}`;  // NO!
```

### 2. **Separation of Concerns**
- **Components**: Pure UI, no data fetching
- **Hooks**: Business logic and data management
- **Contexts**: Global state
- **Utils**: Reusable functions

### 3. **Component Guidelines**
- Keep components **under 200 lines**
- Use **existing hooks** from `src/hooks/data/`
- Follow **file naming conventions** (see architecture doc)

---

## Directory Structure (Quick Reference)

```
src/
├── App.jsx                      # 52-line orchestrator
├── components/
│   ├── AppProviders.jsx         # Context wrapper
│   ├── AppContent.jsx           # View routing
│   ├── clients/                 # Client components
│   ├── quotes/                  # Quote components
│   ├── jobs/                    # Job components
│   ├── invoices/                # Invoice components
│   ├── forms/                   # Form builder & templates
│   └── common/                  # Reusable UI
├── contexts/
│   ├── AuthContext.jsx          # Authentication
│   └── AppStateContext.jsx      # App state
├── hooks/
│   ├── data/                    # Data fetching hooks
│   │   ├── useClients.js
│   │   ├── useQuotes.js
│   │   ├── useJobs.js
│   │   ├── useInvoices.js
│   │   ├── useFormTemplates.js
│   │   └── useFormResponses.js
│   └── ui/                      # UI state hooks
├── utils/
│   ├── formatters.js            # Currency, date, phone
│   ├── calculations.js          # Business calculations
│   ├── dateUtils.js             # Date manipulation
│   ├── textUtils.js             # Text transformation
│   └── validation.js            # Input validation
├── constants/
│   ├── statusConstants.js       # Status colors
│   ├── initialStates.js         # Initial state objects
│   ├── formFieldTypes.js        # Form field definitions
│   └── sampleTemplates.js       # Industry templates
└── firebase/
    └── config.js                # Firebase init
```

---

## Common Patterns

### Data Fetching
```javascript
// ✅ Always use custom hooks
import { useClients } from '../hooks/data';

function MyComponent() {
  const { clients, loading, addClient, updateClient } = useClients();
  // ...
}

// ❌ Never write Firebase queries directly
```

### Context Usage
```javascript
// ✅ Use contexts for global state
import { useAuth } from '../contexts/AuthContext';
import { useAppState } from '../contexts/AppStateContext';

function MyComponent() {
  const { userId } = useAuth();
  const { clients } = useAppState();
  // ...
}
```

### Error Handling
```javascript
// ✅ Always wrap async operations
try {
  await updateClient(id, data);
  showToast('Success', 'success');
} catch (error) {
  console.error('Error:', error);
  showToast(error.message, 'error');
}
```

---

## Brand System (Trellio)

**Colors** (from [brand/TRELLIO_BRAND.md](brand/TRELLIO_BRAND.md)):
- **Primary**: Trellio Teal `#0EA5A0`
- **Accent 1**: Signal Coral `#F7845E`
- **Accent 2**: Harvest Amber `#FFAA5C`
- **Dark BG**: Midnight `#0C1220`
- **Card BG**: Charcoal `#1A2332`

**Typography**:
- **Body**: DM Sans (300-700)
- **Display**: DM Sans Bold (700)
- **Editorial**: Playfair Display Italic
- **Data**: JetBrains Mono

**Voice**:
- Active voice, direct, no jargon
- "crew" not "team", "jobs" not "tasks"
- Celebrate wins: "Your crew crushed it"

---

## Current Phase: Phase 2 Mobile

**What We're Building**:
- Native iOS/Android apps using Expo
- Offline-first with WatermelonDB
- GPS tracking & route optimization
- Form rendering on mobile
- Time tracking with location

**Current Week**: Week 4-5 (Time Tracking & GPS)

**See**: [docs/phases/PHASE_2_IN_PROGRESS.md](docs/phases/PHASE_2_IN_PROGRESS.md) for details.

---

## DO's and DON'Ts

### ✅ DO

1. **Read architecture docs first** - Don't guess patterns
2. **Import from centralized modules** - Use existing utilities
3. **Follow file naming conventions** - PascalCase for components, camelCase for utils
4. **Keep components focused** - Under 200 lines
5. **Use existing hooks** - Don't write Firebase queries directly
6. **Handle errors comprehensively** - Try/catch + user feedback
7. **Follow brand guidelines** - Trellio colors, fonts, voice

### ❌ DON'T

1. **Don't duplicate code** - If it exists, import it
2. **Don't create god components** - Break into smaller pieces
3. **Don't hardcode values** - Use constants
4. **Don't mix concerns** - Separate UI, logic, data
5. **Don't write Firebase queries in components** - Use hooks
6. **Don't skip error handling** - Always handle errors
7. **Don't ignore brand guidelines** - Consistency matters

---

## Git Workflow

**Branch Naming**:
- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `refactor/description` - Code refactoring

**Commit Messages**:
```bash
feat: add client export functionality
fix: resolve invoice calculation bug
refactor: extract payment utilities
docs: update API documentation
```

**Current Branch**: `refactor/code-organization` (or check `git branch`)

---

## Testing Requirements

Before committing:
```bash
npm run lint        # Must pass
npm run build       # Must succeed
# Test in browser    # Critical flows must work
```

---

## Quick Reference Links

**Documentation**:
- [Architecture](docs/TRELLIO_ARCHITECTURE.md) - Technical patterns
- [Master Roadmap](docs/TRELLIO_MASTER_ROADMAP.md) - Product direction
- [Phase 2](docs/phases/PHASE_2_IN_PROGRESS.md) - Current work
- [Setup](docs/guides/SETUP.md) - Dev environment
- [Deployment](docs/guides/DEPLOYMENT.md) - Build & release

**Brand**:
- [Complete Brand Guide](brand/TRELLIO_BRAND.md) - Colors, fonts, voice
- [Brand Quick Reference](brand/README.md) - Cheat sheet

**Code**:
- [Utilities](src/utils/) - All utility functions
- [Constants](src/constants/) - All constants
- [Hooks](src/hooks/data/) - Data management
- [Components](src/components/) - UI components

---

## Context for AI Assistants

**When generating code**:
1. Check if utility/constant exists first (import from `src/utils/` or `src/constants/`)
2. Follow existing patterns in similar files
3. Keep components under 200 lines
4. Use Tailwind for styling (reference brand colors)
5. Import hooks from `src/hooks/data/`
6. Handle errors with try/catch
7. Add JSDoc comments for new functions

**When refactoring**:
1. Maintain zero duplicate code
2. Don't break existing functionality
3. Follow separation of concerns
4. Extract utilities if code is repeated
5. Test thoroughly before committing

**When debugging**:
1. Check browser console for errors
2. Check Firebase Console for backend errors
3. Verify environment variables are set
4. Check Firestore security rules
5. Test with network throttling (slow connection)

---

## Emergency Contacts

- **Technical Issues**: See [docs/guides/SETUP.md#troubleshooting](docs/guides/SETUP.md#troubleshooting)
- **Deployment Issues**: See [docs/guides/DEPLOYMENT.md#troubleshooting](docs/guides/DEPLOYMENT.md#troubleshooting)
- **Architecture Questions**: Read [docs/TRELLIO_ARCHITECTURE.md](docs/TRELLIO_ARCHITECTURE.md)

---

**Last Updated**: February 11, 2026
**Project Status**: Phase 2 In Progress (25% complete)
**Next Milestone**: Phase 2.1 Mobile App (Q1 2026)

---

*This file is auto-loaded by Claude Code. For comprehensive details, see the full documentation in `/docs/`.*

**Happy coding! 🚀**
