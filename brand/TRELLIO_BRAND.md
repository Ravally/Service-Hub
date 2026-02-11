# Trellio — Brand & Design System

> **For Claude Code:** Reference this file for all UI, design, and frontend work.
> Example prompt: "Reference brand/TRELLIO_BRAND.md and build me a..."

**Trellio** (trellio.app) is a field service management platform for home service businesses. Every file, component, page, and UI element must follow this brand system.

## Brand Identity

- **Name:** Trellio
- **Domain:** trellio.app
- **Tagline:** "Structure your growth."
- **Positioning:** The service hub that helps your crew grow upward. Built bold. Designed for the field.
- **Voice:** Bold, practical, human. Talk like a sharp business partner — never like a software manual.

## Brand Principles

1. **Crew First** — Everything starts with the people in the field. If it doesn't make their day easier, it doesn't ship.
2. **Beautifully Obvious** — Premium design, zero learning curve. Intuitive in gloves, in sunlight, in a moving truck.
3. **Growth Architecture** — We provide the structure, the user provides the ambition. The platform scales as they climb.
4. **Earned Trust** — No gimmicks. No dark patterns. Rock-solid invoices, schedules, and payments.

---

## Color Palette

Always reference `brand/tokens.css` or `brand/tokens.json` for exact values. Here is the quick reference:

### Primary
| Name            | Hex       | Usage                              |
|-----------------|-----------|------------------------------------|
| Trellio Teal    | `#0EA5A0` | Primary CTAs, identity, links      |
| Deep Teal       | `#087F7A` | Hover states, active states, depth |
| Frost Mint      | `#B2F0ED` | Success states, light highlights   |
| Teal Glow       | `#0EA5A033` | Glows, shadows, focus rings      |

### Accent
| Name            | Hex       | Usage                              |
|-----------------|-----------|------------------------------------|
| Signal Coral    | `#F7845E` | Energy, urgency, alerts, badges    |
| Harvest Amber   | `#FFAA5C` | Rewards, warmth, notifications     |
| Soft Peach      | `#FFDCC8` | Light accent backgrounds           |

### Neutrals
| Name            | Hex       | Usage                              |
|-----------------|-----------|------------------------------------|
| Midnight        | `#0C1220` | Dark backgrounds, primary bg       |
| Charcoal        | `#1A2332` | Cards, surfaces, secondary bg      |
| Slate           | `#2D3B4E` | Borders, dividers                  |
| Muted           | `#6B7F96` | Placeholder text, disabled states  |
| Silver          | `#A3B4C8` | Body text (on dark), secondary     |
| Warm Cream      | `#FFF9F5` | Light mode backgrounds             |
| White           | `#FFFFFF` | Text on dark, light surfaces       |

### Semantic
| Name            | Hex       | Usage                              |
|-----------------|-----------|------------------------------------|
| Success         | `#0EA5A0` | Confirmations, positive states     |
| Warning         | `#FFAA5C` | Caution, attention needed          |
| Error           | `#F7845E` | Errors, destructive actions        |
| Info            | `#B2F0ED` | Informational banners              |

### Rules
- **Dark mode is default.** Midnight (`#0C1220`) is the primary background.
- **Never use pure black** (`#000000`). Use Midnight instead.
- **Never use pure white backgrounds** in dark mode. Use Charcoal for cards.
- **Trellio Teal is the dominant brand color.** It should be the most prominent color on any page.
- **Coral and Amber are accent only.** Use sparingly for emphasis, never as primary UI colors.
- All interactive elements (buttons, links, toggles) use Trellio Teal as their primary state.

---

## Typography

### Font Stack
| Role       | Font Family        | Weights              | Usage                          |
|------------|--------------------|----------------------|--------------------------------|
| Primary    | `DM Sans`          | 300, 400, 500, 600, 700 | Headlines, body, UI labels  |
| Editorial  | `Playfair Display`  | 400, 500, 600, 700 (+ italic) | Taglines, pull quotes, hero moments |
| Data       | `JetBrains Mono`   | 400, 500             | Metrics, labels, code, timestamps |

### Google Fonts Import
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### CSS Import
```css
font-family: 'DM Sans', system-ui, sans-serif;         /* Primary */
font-family: 'Playfair Display', Georgia, serif;        /* Editorial */
font-family: 'JetBrains Mono', monospace;               /* Data/Code */
```

### Type Scale
| Element      | Font         | Size   | Weight | Letter Spacing | Line Height |
|-------------|--------------|--------|--------|----------------|-------------|
| Display/H1  | DM Sans      | 3.5rem | 700    | -0.04em        | 0.95        |
| H2          | DM Sans      | 2.5rem | 700    | -0.03em        | 1.15        |
| H3          | DM Sans      | 1.5rem | 600    | -0.02em        | 1.3         |
| H4          | DM Sans      | 1.15rem| 600    | -0.01em        | 1.4         |
| Body        | DM Sans      | 1rem   | 300–400| 0              | 1.7         |
| Body Small  | DM Sans      | 0.875rem| 400   | 0              | 1.6         |
| Caption     | JetBrains Mono| 0.75rem| 400   | 0.05em         | 1.5         |
| Label       | JetBrains Mono| 0.65rem| 500   | 0.2em          | 1.2         |
| Tagline     | Playfair Display| 1.15rem| 400 italic| 0          | 1.4         |

### Rules
- **Never use Arial, Inter, Roboto, or system-ui as visible fonts.** Always load DM Sans.
- **Playfair Display is editorial only.** Never use it for buttons, labels, or body text.
- **JetBrains Mono for all data.** Metrics, timestamps, IDs, statuses, and code.
- **Use font-weight 300 (Light) for body text** to keep things open and breathable.
- **Use font-weight 700 (Bold) for headlines** — go heavy and confident.

---

## Logo

The Trellio logo is a **lattice icon mark + lowercase wordmark**. The icon represents a trellis (growth framework) with nodes representing connected crew members.

### Icon Mark SVG
```svg
<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M6 28V14L18 6L30 14V28" stroke="#0EA5A0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M6 20H30" stroke="#0EA5A0" stroke-width="1.8" stroke-linecap="round" opacity="0.7"/>
  <circle cx="18" cy="6" r="2.5" fill="#0EA5A0"/>
  <circle cx="6" cy="14" r="1.8" fill="#F7845E" opacity="0.8"/>
  <circle cx="30" cy="14" r="1.8" fill="#FFAA5C" opacity="0.8"/>
</svg>
```

### ASCII Logo (for terminal/CLI output)
```
    ╱▲╲
   ╱  ●  ╲
  ●───────●
  │       │
  │───────│
  │       │
  trellio
```

### Rules
- Wordmark is always **lowercase**: `trellio`
- Icon always appears **to the left** of the wordmark
- Minimum clear space around logo = height of the "t" in trellio
- On dark backgrounds: white wordmark + colored icon
- On light backgrounds: Midnight wordmark + colored icon
- On Trellio Teal backgrounds: all white

---

## Component Patterns

### Buttons
```css
/* Primary Button */
.btn-primary {
  background: #0EA5A0;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 10px;
  font-family: 'DM Sans', sans-serif;
  font-weight: 600;
  font-size: 0.9rem;
  box-shadow: 0 4px 20px rgba(14, 165, 160, 0.3), inset 0 1px 0 rgba(255,255,255,0.15);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.btn-primary:hover {
  background: #087F7A;
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(14, 165, 160, 0.4);
}

/* Ghost Button */
.btn-ghost {
  background: transparent;
  color: white;
  border: 1px solid rgba(255,255,255,0.15);
  padding: 12px 24px;
  border-radius: 10px;
  font-family: 'DM Sans', sans-serif;
  font-weight: 600;
}
.btn-ghost:hover {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.25);
}
```

### Cards
```css
.card {
  background: #1A2332;
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 16px;
  padding: 1.5rem;
  transition: all 0.3s ease;
}
.card:hover {
  border-color: rgba(14, 165, 160, 0.2);
  transform: translateY(-2px);
}
```

### Inputs
```css
.input {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 12px 16px;
  color: white;
  font-family: 'DM Sans', sans-serif;
}
.input:focus {
  border-color: #0EA5A0;
  box-shadow: 0 0 0 3px rgba(14, 165, 160, 0.15);
  outline: none;
}
```

### Section Labels (monospaced uppercased labels)
```css
.section-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: #0EA5A0;
}
```

---

## Spacing System

Use a base-8 spacing scale:
| Token  | Value  |
|--------|--------|
| xs     | 4px    |
| sm     | 8px    |
| md     | 16px   |
| lg     | 24px   |
| xl     | 32px   |
| 2xl    | 48px   |
| 3xl    | 64px   |
| 4xl    | 96px   |

---

## Border Radius

| Token   | Value  | Usage                 |
|---------|--------|-----------------------|
| sm      | 6px    | Small elements, badges|
| md      | 10px   | Buttons, inputs       |
| lg      | 16px   | Cards                 |
| xl      | 20px   | Large cards, modals   |
| full    | 9999px | Pills, avatars        |

---

## Shadows

```css
--shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.15);
--shadow-md: 0 4px 20px rgba(0, 0, 0, 0.2);
--shadow-lg: 0 8px 40px rgba(0, 0, 0, 0.25);
--shadow-glow-teal: 0 4px 20px rgba(14, 165, 160, 0.3);
--shadow-glow-coral: 0 4px 20px rgba(247, 132, 94, 0.3);
```

---

## Brand Voice Quick Rules

- **Say "crew"** not "team" or "workforce"
- **Say "jobs"** not "tasks" or "work orders"  
- **Say "get paid"** not "process payments"
- **Say "schedule"** not "dispatch workflow"
- **Use active voice.** "Send the invoice" not "The invoice can be sent"
- **Be direct.** "Your crew crushed it today" not "Performance metrics indicate improvement"
- **Celebrate wins.** The UI should make users feel good about their progress.
- **No corporate jargon.** Never say "leverage", "synergy", "optimize throughput", or "scalable solution"

---

## File References

- `brand/tokens.css` — CSS custom properties for all design tokens
- `brand/tokens.json` — JSON design tokens for JS/TS consumption
- `brand/tailwind.config.js` — Tailwind CSS theme extension
- `brand/README.md` — Full brand reference with ASCII art and examples
- `brand/TRELLIO_BRAND.md` — This file (the complete brand spec)

When building any UI, component, or page — **always import and use the brand tokens.** Never hardcode hex values.
