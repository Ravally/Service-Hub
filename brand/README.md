# 🔺 Scaffld Brand Kit

```
         ╱ ▲ ╲
        ╱  ●  ╲
       ●────────●
       │        │
       │────────│
       │        │

     t r e l l i o
   Build on Scaffld.
```

---

## Quick Reference

| Property        | Value                              |
|-----------------|------------------------------------|
| **Name**        | Scaffld (always lowercase)         |
| **Domain**      | scaffld.app                        |
| **Tagline**     | "Build on Scaffld."           |
| **Primary**     | Scaffld Teal `#0EA5A0`             |
| **Accent 1**    | Signal Coral `#F7845E`             |
| **Accent 2**    | Harvest Amber `#FFAA5C`            |
| **Dark BG**     | Midnight `#0C1220`                 |
| **Card BG**     | Charcoal `#1A2332`                 |
| **Light BG**    | Warm Cream `#FFF9F5`               |
| **Body Font**   | DM Sans (300–700)                  |
| **Display Font**| DM Sans Bold (700)                 |
| **Editorial**   | Playfair Display Italic            |
| **Data Font**   | JetBrains Mono                     |

---

## Files in This Kit

```
brand/
├── SCAFFLD_BRAND.md           ← Complete brand spec (tell Claude Code to reference this)
├── README.md                  ← You are here
├── tokens.css                 ← CSS custom properties (import into any project)
├── tokens.json                ← JSON tokens (for JS/TS/Node consumption)
└── tailwind.config.js         ← Tailwind theme extension
```

### How to Use with Claude Code

Add this line to your existing `CLAUDE.md` in the project root:

```
For all UI, design, and frontend work, follow the brand system defined in brand/SCAFFLD_BRAND.md
```

Or when prompting Claude Code, just say:

> "Reference brand/SCAFFLD_BRAND.md and build me a..."

---

## Color Palette

### Primary
```
  ┌─────────────────────────┐
  │   SCAFFLD TEAL          │
  │   #0EA5A0               │  ← CTAs, links, identity
  └─────────────────────────┘
  ┌─────────────────────────┐
  │   DEEP TEAL             │
  │   #087F7A               │  ← Hover, active, depth
  └─────────────────────────┘
  ┌─────────────────────────┐
  │   FROST MINT            │
  │   #B2F0ED               │  ← Success, light highlight
  └─────────────────────────┘
```

### Accent
```
  ┌─────────────────────────┐
  │   SIGNAL CORAL          │
  │   #F7845E               │  ← Energy, urgency, alerts
  └─────────────────────────┘
  ┌─────────────────────────┐
  │   HARVEST AMBER         │
  │   #FFAA5C               │  ← Rewards, warmth, notifications
  └─────────────────────────┘
```

### Neutrals
```
  ┌─────────────────────────┐
  │   MIDNIGHT              │
  │   #0C1220               │  ← Primary background
  └─────────────────────────┘
  ┌─────────────────────────┐
  │   CHARCOAL              │
  │   #1A2332               │  ← Cards, surfaces
  └─────────────────────────┘
  ┌─────────────────────────┐
  │   SLATE                 │
  │   #2D3B4E               │  ← Borders, dividers
  └─────────────────────────┘
  ┌─────────────────────────┐
  │   MUTED                 │
  │   #6B7F96               │  ← Placeholders, disabled
  └─────────────────────────┘
  ┌─────────────────────────┐
  │   SILVER                │
  │   #A3B4C8               │  ← Body text (dark mode)
  └─────────────────────────┘
  ┌─────────────────────────┐
  │   WARM CREAM            │
  │   #FFF9F5               │  ← Light mode background
  └─────────────────────────┘
```

---

## Typography Cheat Sheet

```
HEADLINES (DM Sans Bold 700)
─────────────────────────────
Display:  3.5rem  / tracking: -0.04em  / leading: 0.95
H1:       2.5rem  / tracking: -0.03em  / leading: 1.15
H2:       2.0rem  / tracking: -0.02em  / leading: 1.15
H3:       1.5rem  / tracking: -0.02em  / leading: 1.3
H4:       1.15rem / tracking: -0.01em  / leading: 1.4

BODY (DM Sans Light 300 / Regular 400)
─────────────────────────────
Body:     1.0rem   / leading: 1.7
Body SM:  0.875rem / leading: 1.6

EDITORIAL (Playfair Display Italic)
─────────────────────────────
Tagline:  1.15rem  / leading: 1.4

DATA (JetBrains Mono)
─────────────────────────────
Caption:  0.75rem  / tracking: 0.05em  / leading: 1.5
Label:    0.65rem  / tracking: 0.2em   / leading: 1.2  / UPPERCASE
```

---

## Logo Usage

### Contexts
| Background       | Wordmark Color | Icon Colors                |
|-----------------|----------------|----------------------------|
| Dark (Midnight) | White           | Teal + Coral + Amber nodes |
| Light (Cream)   | Midnight        | Teal + Coral + Amber nodes |
| Scaffld Teal    | White           | All white                  |

### Rules
- Wordmark is always **lowercase**: `scaffld`
- Icon always appears **left** of wordmark
- Minimum clear space = height of the letter "t"
- Never rotate, distort, or recolor the icon beyond defined variations
- Never place the logo on busy/patterned backgrounds without a container

---

## Brand Voice

### We Sound Like
A sharp, experienced business partner who's been in the field.

### Word Choices
| ✅ Say           | ❌ Don't Say                        |
|-----------------|--------------------------------------|
| crew            | team, workforce, human resources     |
| jobs            | tasks, work orders, tickets          |
| get paid        | process payments, collect receivables|
| schedule        | dispatch workflow, resource plan     |
| grow            | scale, optimize, transform           |
| your business   | your enterprise, your organization   |

### Tone Rules
1. **Active voice.** Always. "Send the invoice" not "The invoice will be sent."
2. **Be direct.** Short sentences. Clear verbs.
3. **Celebrate wins.** "Your crew crushed it" not "Metrics indicate improvement."
4. **No jargon.** If a plumber wouldn't say it, we don't write it.
5. **Confident, not arrogant.** We know our stuff. We don't need to shout.

---

## Setup Instructions

### In Any Web Project
```html
<!-- Add to <head> -->
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="./brand/tokens.css">
```

### In Tailwind Projects
```js
// tailwind.config.js
const scaffldTheme = require('./brand/tailwind.config.js');

module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      ...scaffldTheme.theme.extend,
    },
  },
};
```

### In JS/TS
```js
import tokens from './brand/tokens.json';

const primaryColor = tokens.colors.primary.DEFAULT; // '#0EA5A0'
const fontPrimary = tokens.typography.fonts.primary; // 'DM Sans, ...'
```

---

## Claude Code Integration

Add this line to your existing `CLAUDE.md` in the project root:

```markdown
For all UI, design, and frontend work, follow the brand system defined in brand/SCAFFLD_BRAND.md
```

Or reference it directly when prompting:

```
> Reference brand/SCAFFLD_BRAND.md and build me a dashboard page
> Using the Scaffld brand in brand/SCAFFLD_BRAND.md, create a login component
```

The `SCAFFLD_BRAND.md` file contains the complete brand specification — colors, typography, logo, voice, component patterns — so Claude Code will generate on-brand UI every time.

---

*Scaffld Brand Kit — 2026 — Confidential*
