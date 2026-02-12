---
name: trellio-design-reference
description: "Reference Trellio's approved HTML design mockups and brand system when building UI. Use when: creating pages, converting designs to React/Next.js, building layouts, matching design patterns, or any visual/UI work. Triggers: 'match the design', 'follow the mockup', 'like the homepage', 'same style as', 'convert to React', or any UI task needing visual consistency."
---

# Trellio Design Reference

## Overview

This skill points Claude to Trellio's approved design files — the HTML mockups and brand system that define the exact look, feel, and interaction patterns. These are the **source of truth** for all visual decisions.

**Before building ANY UI:** Read the relevant HTML file from `design/mockups/` and the brand spec from `brand/TRELLIO_BRAND.md` to extract exact patterns.

## Design Files

Located in `design/mockups/` (copy your 6 HTML files here):

| File | Page | Extract These Patterns |
|------|------|----------------------|
| `index.html` | Homepage | Hero layout, gradient bar, glassmorphic nav, social proof bar, feature cards, 3D mockup, testimonials, industry grid, CTA, footer |
| `features.html` | Features | Alternating light/dark sections, inline mockups (schedule, invoice, CRM, charts, AI chat), feature grid |
| `pricing.html` | Pricing | Monthly/annual toggle, 3-tier cards (featured dark card), comparison table, FAQ accordion |
| `industries.html` | Industries | Industry cards with icons, vertical breakdowns, use-case testimonials |
| `about.html` | About | Story section, mission/values, team grid, timeline |
| `contact.html` | Contact | Contact form, channel cards, office cards |

## Brand Files

Located in `brand/`:

| File | Contains |
|------|---------|
| `TRELLIO_BRAND.md` | Complete brand spec — colors, typography, voice, component patterns |
| `tokens.css` | CSS custom properties for all design tokens |
| `tokens.json` | JSON tokens for JS/TS consumption |
| `tailwind.config.js` | Tailwind theme extension with Trellio tokens |

## Converting HTML Mockups to React/Next.js

When you read a mockup HTML file, translate patterns like this:

```
HTML Pattern                    →  React/Next.js Equivalent
────────────────────────────────────────────────────────────
CSS custom properties           →  Tailwind theme tokens (tailwind.config.js)
Inline <style> blocks           →  Tailwind utility classes
.reveal scroll animations       →  Framer Motion or useIntersectionObserver hook
onclick handlers                →  React event handlers
<a href="page.html">           →  <Link href="/page">
Multi-page nav with .active     →  usePathname() + conditional className
<section> blocks                →  Extract into separate React components
Inline SVG icons                →  Lucide React icons (match the intent)
CSS media queries               →  Tailwind responsive prefixes (sm:, md:, lg:)
```

## Design System Rules (Extracted from HTML)

These patterns are consistent across all 6 pages. **Always maintain them:**

**Section Rhythm:**
```
[Gradient bar — 4px, teal→amber→coral]
[Nav — glassmorphic blur on scroll, fixed]
[Hero — light background]
[Content — alternate light (#FFF9F5) and dark (#0C1220) sections]
[CTA — always dark with lattice background]
[Footer — dark]
```

**Typography Hierarchy:**
- Section labels: JetBrains Mono, uppercase, 0.75rem, teal, letter-spacing 0.15em
- H1: DM Sans Bold, 3.2rem desktop / 2rem mobile
- H2: DM Sans Bold, 2.4rem desktop / 1.6rem mobile
- Editorial accents: Playfair Display Italic (sparingly, for taglines)
- Body: DM Sans Regular, 1rem, muted gray

**Animation Pattern (.reveal class):**
- Start: `opacity: 0; transform: translateY(30px)`
- Visible: `opacity: 1; transform: translateY(0)`
- Stagger: 0.1s increments per element
- Duration: 0.6s ease-out
- Trigger: Intersection Observer, threshold 0.1

**Card Patterns:**
- Light background cards: `border: 1px solid gray-200, rounded-2xl, shadow-sm, hover:shadow-md hover:-translate-y-1`
- Dark background cards: `border: 1px solid rgba(255,255,255,0.06), bg-charcoal, rounded-2xl`
- Transition: 0.3s ease on all interactive elements

**Button Variants (from mockups):**
- Primary: teal bg, white text, rounded-lg, px-6 py-3
- Secondary: transparent, teal border, teal text
- On dark: white bg, midnight text
- All buttons: min-height 44px for field-readiness

## Workflow

1. **Read the mockup:** `cat design/mockups/[page].html` — understand the exact layout
2. **Read brand spec:** `cat brand/TRELLIO_BRAND.md` — confirm tokens and voice
3. **Build in React/Next.js** following trellio-component skill conventions
4. **Visually compare** output against the HTML mockup in browser
5. **Preserve the feel** — the mockups represent approved design direction
