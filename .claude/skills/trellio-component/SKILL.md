---
name: trellio-component
description: "Create React/Next.js UI components for Trellio following brand guidelines, design tokens, and project conventions. Use when: building pages, forms, cards, modals, dashboards, tables, navigation, or any user-facing UI. Triggers include: 'create a component', 'build a page', 'add a form', 'new section', 'UI for', or any request involving visual elements, layouts, or interactive features for the Trellio app."
---

# Trellio Component Generator

## Overview

Generate production-ready React components for Trellio — a field service management platform for home service businesses. Every component must be field-ready: usable in sunlight, with gloves, on a moving truck.

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS with custom Trellio theme
- **State:** React hooks + context (Zustand for global state if needed)
- **Forms:** React Hook Form + Zod validation
- **Icons:** Lucide React

## Brand Tokens (Required)

Always use these — never hardcode hex values directly.

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

## File Structure

```
src/
├── components/
│   ├── ui/                    # Shared primitives (Button, Input, Card, Modal, Badge)
│   ├── forms/                 # Form components (JobForm, InvoiceForm, ClientForm)
│   ├── layout/                # Layout components (Sidebar, Header, MobileNav)
│   ├── dashboard/             # Dashboard-specific widgets
│   ├── scheduling/            # Calendar, time slots, dispatch
│   ├── invoicing/             # Invoice builder, line items, payment
│   └── clients/               # Client cards, lists, detail views
├── app/
│   ├── (dashboard)/           # Authenticated dashboard routes
│   ├── (marketing)/           # Public marketing pages
│   └── (auth)/                # Login, signup, forgot password
└── lib/
    ├── hooks/                 # Custom hooks
    ├── utils/                 # Utility functions
    └── types/                 # Shared TypeScript types
```

## Component Template

Every component must follow this structure:

```tsx
// src/components/[feature]/ComponentName.tsx
"use client"; // Only if using hooks, events, or browser APIs

import { type FC } from "react";
// Group imports: React → Next.js → external libs → internal components → types

interface ComponentNameProps {
  // Always define explicit prop types — never use `any`
}

/**
 * Brief description of what this component does.
 * Used in: [where this component appears]
 */
export const ComponentName: FC<ComponentNameProps> = ({ ...props }) => {
  return (
    {/* Component JSX */}
  );
};
```

## Rules

### Accessibility & Field-Readiness
- **Minimum touch target:** 44x44px (48x48px preferred for field use)
- **Minimum font size:** 16px body, 14px captions (no smaller)
- **Contrast ratio:** 4.5:1 minimum for all text
- **Always include:** `aria-label`, `role`, keyboard navigation, focus indicators
- **Forms:** Always associate labels with inputs, show inline validation errors
- **Loading states:** Always show skeleton/spinner — never leave users guessing

### Responsive Design
- **Mobile-first:** Write mobile styles first, then `md:` and `lg:` breakpoints
- **Breakpoints:** `sm: 640px` | `md: 768px` | `lg: 1024px` | `xl: 1280px`
- **Dashboard layout:** Collapsible sidebar on mobile → persistent sidebar on `lg:`
- **Tables:** Horizontal scroll on mobile, or convert to card layout

### Naming & Exports
- **Files:** PascalCase matching component name: `JobCard.tsx`
- **Named exports only:** `export const JobCard` — never default exports
- **Props interface:** `ComponentNameProps` — always exported
- **Hooks:** `use` prefix: `useJobs`, `useSchedule`

### State & Data
- **Server Components by default** — only add `"use client"` when necessary
- **Data fetching:** Server Components with `async/await`, or React Query for client-side
- **Forms:** React Hook Form + Zod schema (never uncontrolled without validation)
- **URL state:** Use `nuqs` or `useSearchParams` for filters, pagination, tabs

### Do NOT
- Use inline styles — always Tailwind classes
- Hardcode colors — always use Trellio theme tokens
- Create files longer than 250 lines — split into sub-components
- Use `any` type — always explicit TypeScript types
- Skip loading/error/empty states — every data-driven component needs all three
- Forget dark mode — Trellio uses `class` strategy for dark mode toggling

## Example Patterns

### Button Variants
```tsx
// Use consistent button patterns across the app
<Button variant="primary">   // trellio-teal bg, white text
<Button variant="secondary">  // border trellio-teal, teal text
<Button variant="danger">     // trellio-coral bg, white text
<Button variant="ghost">      // transparent, teal text, hover bg
```

### Card Pattern (Field-Ready)
```tsx
<div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm
                hover:shadow-md transition-shadow
                dark:bg-trellio-charcoal dark:border-gray-700">
  {/* Large touch-friendly content */}
</div>
```

### Empty State Pattern
```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <IconComponent className="h-12 w-12 text-trellio-gray mb-4" />
  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
    No jobs scheduled
  </h3>
  <p className="mt-1 text-sm text-trellio-gray max-w-sm">
    Create your first job to get started with scheduling.
  </p>
  <Button variant="primary" className="mt-4">
    Create Job
  </Button>
</div>
```

## Checklist Before Finishing

- [ ] TypeScript strict — no `any`, no `@ts-ignore`
- [ ] All interactive elements have 44px+ touch targets
- [ ] Loading, error, and empty states are handled
- [ ] Responsive: tested at mobile, tablet, and desktop widths
- [ ] Dark mode classes included
- [ ] Accessible: labels, ARIA, keyboard nav, focus rings
- [ ] File is under 250 lines (split if needed)
- [ ] Named export, proper file location, consistent naming
