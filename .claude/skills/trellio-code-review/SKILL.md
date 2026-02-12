---
name: trellio-code-review
description: "Review Trellio code for quality, security, performance, accessibility, and adherence to project conventions. Use when: reviewing code, checking a PR, auditing files, validating a feature, or asked to 'review', 'check', 'audit', or 'look over' code. Also use after completing a feature to self-review before committing."
context: fork
agent: Explore
allowed-tools: Read, Grep, Glob
---

# Trellio Code Reviewer

## Overview

Review code for Trellio (React + Vite + Firebase/Firestore + Tailwind). Focus on security (especially multi-tenancy), code quality, accessibility, and performance.

Severity ratings:
- 🔴 **BLOCKER** — Must fix (security holes, data leaks, crashes)
- 🟡 **WARNING** — Should fix (performance, accessibility, conventions)
- 🟢 **SUGGESTION** — Nice to have (readability, style)

## 1. Security Review

```
[ ] All Firestore reads/writes scoped under companies/{companyId}
[ ] No companyId taken from client input — always from AuthContext/user profile
[ ] Cloud Functions verify context.auth before processing
[ ] Public routes use token-based access (publicToken pattern)
[ ] No Firebase config secrets exposed beyond standard client SDK config
[ ] No dangerouslySetInnerHTML without sanitization
[ ] Firestore security rules cover any new collections
[ ] Stripe webhook signatures verified in Cloud Functions
[ ] No raw user input written to Firestore without validation
```

**Multi-tenancy is the #1 concern.** Every Firestore path must include `companies/{companyId}`. Missing this means one customer sees another's data.

## 2. JavaScript & React Review

```
[ ] No TypeScript (project is JSX) — no .ts/.tsx files
[ ] Default exports: export default function ComponentName
[ ] Props destructured in function signature
[ ] No unused imports or variables
[ ] useEffect cleanup functions for subscriptions (return unsub)
[ ] useEffect dependency arrays correct (no missing/extra deps)
[ ] No state updates on unmounted components
[ ] Event handlers use handle prefix (handleSave, handleDelete)
[ ] Constants used from src/constants/ — no magic strings
[ ] Utility functions from src/utils/ — no duplicated logic
```

## 3. Component Review

```
[ ] File under 250 lines — split if larger
[ ] Loading and empty states handled
[ ] Touch targets 44px+ (field workers use gloves/sunlight)
[ ] Minimum 16px font body, 14px captions
[ ] ARIA labels on interactive elements
[ ] Focus rings visible for keyboard navigation
[ ] Brand tokens used — no hardcoded hex colors
[ ] Responsive: mobile-first with md: and lg: breakpoints
[ ] No inline styles — Tailwind only
[ ] Images have alt text
[ ] New views registered in AppContent.jsx
[ ] Navigation via setCurrentView (not browser routing)
```

## 4. Data / Firestore Review

```
[ ] All collections under companies/{companyId}
[ ] serverTimestamp() on createdAt and updatedAt
[ ] Real-time subscriptions use onSnapshot (not getDoc for UI data)
[ ] Subscriptions cleaned up in useEffect return
[ ] Handlers follow existing pattern in hooks/data/
[ ] New handlers registered in useAppHandlers.js
[ ] Status values match src/constants/statusConstants.js
[ ] No unbounded queries (always filter or limit)
[ ] Money stored as decimal numbers (app convention)
[ ] Composite indexes added for multi-field queries
```

## 5. Performance Review

```
[ ] No unnecessary re-renders (stable handler references)
[ ] Firestore subscriptions don't over-fetch (use where/limit)
[ ] Large lists use pagination or virtual scrolling
[ ] No synchronous heavy computation in render
[ ] Images optimized (compressed, sized appropriately)
[ ] No duplicate Firestore subscriptions for same data
[ ] useEffect dependencies don't cause infinite loops
```

## 6. Code Quality

```
[ ] Functions do one thing — under 40 lines preferred
[ ] Variable names are descriptive (not x, temp, data)
[ ] No commented-out code blocks
[ ] No console.log left in (except error handlers)
[ ] DRY — no duplicated logic across files
[ ] Constants extracted — no magic numbers or strings
[ ] Error messages are user-friendly
[ ] Consistent with rest of codebase patterns
```

## Output Format

```
## Code Review: [filename or feature]

### Summary
[1-2 sentences: what this does, overall quality]

### 🔴 Blockers (X found)
1. **[File:Line]** — [Issue]
   → Fix: [Specific recommendation]

### 🟡 Warnings (X found)
1. **[File:Line]** — [Issue]
   → Fix: [Recommendation]

### 🟢 Suggestions (X found)
1. **[File:Line]** — [Improvement]

### ✅ What's Good
- [Highlight good patterns]

### Verdict
[APPROVE / REQUEST CHANGES / NEEDS DISCUSSION]
```

## Self-Review Checklist

After building a feature, check:
1. Every Firestore path includes `companyId`?
2. Subscriptions cleaned up on unmount?
3. Loading/empty states handled?
4. File under 250 lines?
5. Brand tokens, no hardcoded colors?
