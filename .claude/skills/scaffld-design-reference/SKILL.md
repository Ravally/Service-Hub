---
name: scaffld-design-reference
description: "Reference Scaffld's approved HTML design mockups and brand system when building UI. Use when: creating pages, matching design patterns, or any visual/UI work. Triggers: 'match the design', 'follow the mockup', 'like the homepage', 'same style as', 'convert to React', or any UI task needing visual consistency."
---

# Scaffld Design Reference

## Overview

Points Claude to Scaffld's approved design files — the HTML mockups and brand system that define the exact look, feel, and interaction patterns. These are the **source of truth** for all visual decisions.

**Before building ANY UI:** Read the relevant HTML file from `design/mockups/` and the brand spec from `brand/SCAFFLD_BRAND.md`.

## Design Files

Located in `design/mockups/`:

| File | Page | Key Patterns |
|------|------|-------------|
| `index.html` | Homepage | Hero, gradient bar, glassmorphic nav, social proof, feature cards, 3D mockup, testimonials, footer |
| `features.html` | Features | Alternating light/dark sections, inline mockups (schedule, invoice, CRM, charts, AI chat) |
| `pricing.html` | Pricing | Monthly/annual toggle, 3-tier cards, comparison table, FAQ accordion |
| `industries.html` | Industries | Industry cards, vertical breakdowns, testimonials |
| `about.html` | About | Story section, mission/values, team grid, timeline |
| `contact.html` | Contact | Contact form, channel cards, office cards |
| `Scaffld_Brand_Concept.html` | Brand Identity | Full palette, typography specimens, UI dashboard mockup, lattice patterns |

## Brand Files

Located in `brand/`:

| File | Contains |
|------|---------|
| `SCAFFLD_BRAND.md` | Complete brand spec — colors, typography, voice, component patterns |
| `tokens.css` | CSS custom properties |
| `tokens.json` | JSON tokens for JS consumption |
| `tailwind.config.js` | Tailwind theme extension |

## Converting HTML Mockups to React Components

```
HTML Pattern                    →  React Equivalent
────────────────────────────────────────────────────
CSS custom properties           →  Tailwind theme tokens
Inline <style> blocks           →  Tailwind utility classes
.reveal scroll animations       →  useEffect + IntersectionObserver
onclick handlers                →  React event handlers (onClick)
<a href="page.html">           →  setCurrentView('page') via AppStateContext
Multi-page nav with .active     →  currentView comparison for active class
<section> blocks                →  Extract into separate components
Inline SVG icons                →  components/icons/ SVG components
CSS media queries               →  Tailwind responsive prefixes (sm:, md:, lg:)
```

**IMPORTANT:** Scaffld uses client-side view routing via `AppContent.jsx` and `setCurrentView()` — NOT React Router or Next.js routing.

## Design System Rules (from HTML mockups)

**Section Rhythm:**
```
[Gradient bar — 4px, teal→amber→coral]
[Nav — glassmorphic blur on scroll, fixed]
[Hero — light background]
[Content — alternate light (#FFF9F5) and dark (#0C1220)]
[CTA — always dark with lattice background]
[Footer — dark]
```

**Typography:**
- Section labels: JetBrains Mono, uppercase, 0.75rem, teal, letter-spacing 0.15em
- H1: DM Sans Bold, 3.2rem desktop / 2rem mobile
- H2: DM Sans Bold, 2.4rem desktop / 1.6rem mobile
- Editorial: Playfair Display Italic (sparingly)
- Body: DM Sans Regular, 1rem, muted gray

**Animations (.reveal):**
- Start: `opacity: 0; transform: translateY(30px)`
- Visible: `opacity: 1; transform: translateY(0)`
- Stagger: 0.1s per element, 0.6s ease-out
- Trigger: IntersectionObserver, threshold 0.1

**Cards:**
- Light bg: border gray-200, rounded-2xl, shadow-sm, hover:shadow-md hover:-translate-y-1
- Dark bg: border rgba(255,255,255,0.06), bg-charcoal, rounded-2xl
- Transition: 0.3s ease

**Buttons:**
- Primary: teal bg, white text, rounded-lg, px-6 py-3, min-height 44px
- Secondary: transparent, teal border, teal text
- On dark: white bg, midnight text

## Workflow

1. Read the mockup: examine `design/mockups/[page].html`
2. Read brand spec: check `brand/SCAFFLD_BRAND.md`
3. Build in React (JSX) following scaffld-component skill conventions
4. Visually compare against the HTML mockup
5. Preserve the feel — mockups represent approved design direction
