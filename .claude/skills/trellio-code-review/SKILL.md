---
name: trellio-code-review
description: "Review Trellio code for quality, security, performance, accessibility, and adherence to project conventions. Use when: reviewing code, checking a PR, auditing files, validating a feature implementation, or when asked to 'review', 'check', 'audit', 'validate', or 'look over' code. Also use after completing a feature to self-review before committing."
context: fork
agent: Explore
allowed-tools: Read, Grep, Glob
---

# Trellio Code Reviewer

## Overview

Perform thorough code reviews for the Trellio field service management platform. Review against project conventions, security best practices, performance, accessibility, and TypeScript correctness.

## Review Process

Run through each category below. For each issue found, rate severity:

- 🔴 **BLOCKER** — Must fix before merge (security holes, data leaks, crashes)
- 🟡 **WARNING** — Should fix (performance, accessibility, convention violations)
- 🟢 **SUGGESTION** — Nice to have (readability, style, minor improvements)

### 1. Security Review

Check for these **blockers**:

```
[ ] Auth check at the top of every API route and Server Action
[ ] organizationId scoping on EVERY database query (multi-tenancy leak = critical)
[ ] Zod validation on all user input before it touches the database
[ ] No raw SQL with string interpolation (SQL injection risk)
[ ] No secrets/API keys/credentials in code (check for hardcoded strings)
[ ] Stripe webhook signature verification on payment endpoints
[ ] No `dangerouslySetInnerHTML` without sanitization
[ ] CSRF protection on Server Actions (Next.js handles this, but verify)
[ ] Rate limiting on public-facing endpoints (login, signup, password reset)
[ ] File upload validation (type, size) if applicable
```

**Multi-tenancy is the #1 security concern.** Every single database read/write must be scoped to `session.user.organizationId`. A missing org filter means one customer can see another's data.

### 2. TypeScript Review

```
[ ] No `any` types — every variable, param, and return type is explicit
[ ] No `@ts-ignore` or `@ts-expect-error` without a comment explaining why
[ ] Props interfaces exported and properly named (ComponentNameProps)
[ ] Zod schemas infer types: `type Job = z.infer<typeof jobSchema>`
[ ] Discriminated unions used for state (not boolean flags)
[ ] Proper null handling (no non-null assertions `!` without justification)
[ ] Generic types where reuse is clear
```

### 3. Component Review (React/Next.js)

```
[ ] Server Components by default — "use client" only when necessary
[ ] Named exports (not default exports)
[ ] File under 250 lines — split if larger
[ ] Loading, error, and empty states handled
[ ] Touch targets 44px+ (48px preferred for field-use components)
[ ] Minimum 16px font body, 14px captions
[ ] Dark mode classes included (dark: prefix)
[ ] ARIA labels on interactive elements
[ ] Keyboard navigation works (tab, enter, escape)
[ ] Focus rings visible
[ ] Brand tokens used — no hardcoded hex colors
[ ] Responsive: mobile styles first, then md: and lg:
[ ] No inline styles — Tailwind only
[ ] Images have alt text, use next/image
[ ] Links use next/link
```

### 4. API / Backend Review

```
[ ] Route handlers start with auth check
[ ] Proper HTTP status codes (see trellio-api skill for reference)
[ ] Zod validation on request body AND query params
[ ] Error responses use apiError() helper — no raw NextResponse.json
[ ] List endpoints have pagination (page, limit, total, totalPages)
[ ] Database queries scoped to organizationId
[ ] Service layer used for complex business logic (not all in route handler)
[ ] Server Actions return typed state objects
[ ] revalidatePath() called after mutations
[ ] try/catch with console.error on every handler
[ ] No N+1 queries — use include/select or batch queries
```

### 5. Database / Prisma Review

```
[ ] organizationId on every business model
[ ] Cascade delete from Organization
[ ] createdAt + updatedAt on every model
[ ] Money stored as Int (cents) — never Float
[ ] Composite indexes with organizationId first
[ ] No raw SQL unless absolutely necessary
[ ] Soft delete (deletedAt) on critical business models
[ ] Migration name is descriptive
[ ] Enum values are SCREAMING_SNAKE_CASE
[ ] No breaking schema changes without data migration plan
```

### 6. Performance Review

```
[ ] No unnecessary re-renders (check useCallback, useMemo usage)
[ ] Images optimized with next/image
[ ] Heavy computations not running on every render
[ ] Database queries use select/include to avoid over-fetching
[ ] Pagination on all list queries — no unbounded findMany()
[ ] No synchronous operations blocking the event loop
[ ] Lazy loading for heavy components (dynamic imports)
[ ] Proper caching headers on API routes where appropriate
```

### 7. Code Quality

```
[ ] Functions do one thing — under 40 lines preferred
[ ] Variable names are descriptive (not x, temp, data, item)
[ ] No commented-out code blocks (delete it, git has history)
[ ] No console.log left in (except console.error in catch blocks)
[ ] DRY — no duplicated logic across files
[ ] Constants extracted — no magic numbers or strings
[ ] Error messages are user-friendly (not technical jargon)
[ ] Consistent code style with rest of codebase
```

## Output Format

Structure your review like this:

```
## Code Review: [filename or feature name]

### Summary
[1-2 sentence overview: what this code does and overall quality impression]

### 🔴 Blockers (X found)
1. **[File:Line]** — [Description of issue]
   → Fix: [Specific fix recommendation]

### 🟡 Warnings (X found)
1. **[File:Line]** — [Description of issue]
   → Fix: [Specific fix recommendation]

### 🟢 Suggestions (X found)
1. **[File:Line]** — [Description of issue]
   → Consider: [Improvement recommendation]

### ✅ What's Good
- [Highlight things done well — reinforce good patterns]

### Verdict
[APPROVE / REQUEST CHANGES / NEEDS DISCUSSION]
```

## Self-Review Mode

After completing a feature, run this skill on your own output before committing. Focus especially on:

1. Multi-tenancy: Did every query get `organizationId`?
2. Types: Any `any` or missing types?
3. States: Are loading/error/empty states all handled?
4. Accessibility: Would a field tech on a bright day with gloves struggle?
5. Security: Could another org's data leak through any path?

## Rules

- **Be specific** — reference exact file names and line numbers
- **Be constructive** — explain WHY something is a problem, not just that it is
- **Prioritize security** — multi-tenancy and auth issues are always blockers
- **Acknowledge good work** — highlight patterns that should be replicated
- **Don't nitpick formatting** — Prettier and ESLint handle that
- **Focus on logic and architecture** — that's where reviews add the most value
