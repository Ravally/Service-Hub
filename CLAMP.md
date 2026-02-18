# Clamp — Scaffld's AI Design System

Clamp is Scaffld's AI assistant. Every AI-powered feature in the platform lives under the Clamp brand — one icon, one colour, one voice.

## Icon

The Clamp icon is a stylised bracket/clamp. On web, use the `ClampIcon` SVG component. On mobile, use `react-native-svg`.

```svg
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M7 4V20" />
  <path d="M7 4H11C13.2091 4 15 5.79086 15 8V8C15 10.2091 13.2091 12 11 12H7" />
  <path d="M17 4V20" />
  <path d="M17 12H13" />
</svg>
```

Never use sparkle emoji (✨), magic wand, robot, or generic AI icons. The Clamp icon is the only AI indicator.

## Colour Palette

Clamp uses **amber** — distinct from the app's primary teal, so AI features are instantly recognisable but don't compete with the core brand.

| Token | Hex | Usage |
|-------|-----|-------|
| `clamp` | `#F59E0B` | Icon, label text, active border |
| `clamp-soft` | `rgba(245, 158, 11, 0.10)` | Card/panel background |
| `clamp-border` | `rgba(245, 158, 11, 0.25)` | Card border, button border |
| `clamp-hover` | `rgba(245, 158, 11, 0.20)` | Button hover background |
| `clamp-deep` | `#D97706` | Pressed/active state |

**Web (Tailwind):** Add to `tailwind.config.js` under `extend.colors.clamp`. Also add CSS variables `--clamp`, `--clamp-soft`, `--clamp-border` in `:root`.

**Mobile (React Native):** Add tokens to `src/theme/colors.js` under the existing colour map.

Never use purple/violet (`#A78BFA`) for AI features. Never use the app's primary teal for Clamp.

## Voice

Clamp speaks like a sharp colleague — helpful, direct, zero filler.

| Rule | Example |
|------|---------|
| No first-person | "3 line items generated" not "I generated 3 line items" |
| No chatbot tone | "Ready to generate" not "Hey! Let me help you with that!" |
| No emoji in output | "Summary complete" not "✨ Summary complete!" |
| Action-oriented | "Generate line items" not "Click here to use AI" |
| Error = next step | "Couldn't reach Clamp — check your connection and retry" |

Loading states: **"Clamp is working..."** (never "AI is thinking" or "Generating...")

## Components

### Web (`src/components/clamp/`)

| Component | File | Purpose |
|-----------|------|---------|
| `ClampIcon` | `ClampIcon.jsx` | SVG icon, accepts `size` and `className` |
| `ClampButton` | `ClampButton.jsx` | Trigger button — amber pill, ClampIcon + label |
| `ClampResultPreview` | `ClampResultPreview.jsx` | Result panel with Use / Retry / Keep Original |
| `ClampRewriteButtons` | `ClampRewriteButtons.jsx` | Tone buttons (Cheerful / Casual / Professional / Shorter) + inline preview |

#### ClampButton props
```jsx
<ClampButton
  label="Ask Clamp"        // default label
  onClick={handleGenerate}
  loading={isLoading}
  disabled={false}
  size="sm"                // "sm" | "md"
/>
```

#### ClampResultPreview props
```jsx
<ClampResultPreview
  result={text}
  loading={isLoading}
  label="Clamp Result"
  onAccept={handleUse}
  onReject={handleDismiss}
  onRetry={handleRetry}
/>
```

Results always preview before applying. Never auto-apply AI output.

### Mobile (`src/components/clamp/`)

Same component names. Use React Native + `react-native-svg` for the icon. Bottom sheet for result previews (`@gorhom/bottom-sheet` if available, otherwise modal). Haptic feedback (`expo-haptics`) on generate and result ready.

## Cloud Function Contract

All AI calls route through the `scaffldAI` Firebase callable function.

**Backend:** `functions/ai.js` — switch on `action`, system prompts in `functions/prompts.js`
**Model:** claude-sonnet-4-20250514 via @anthropic-ai/sdk

### Actions

| Action | Input | Output |
|--------|-------|--------|
| `quoteWriter` | Free-text job description | JSON array: `[{description, quantity, unit, unitPrice}]` |
| `noteRewrite` | `Tone: {tone}\n\n{notes}` | Rewritten text |
| `emailDraft` | Template context + prompt | Email body text |
| `invoiceDescription` | Brief line item descriptions | JSON array of improved strings |
| `jobSummary` | Job data summary | Completion summary text |

### Frontend Services

**Web:** `src/services/aiService.js` — uses `httpsCallable(functions, 'scaffldAI')`
**Mobile:** `src/services/aiService.js` — uses `fetch(FUNCTIONS_BASE_URL/scaffldAI)` with `Authorization: Bearer {idToken}`

Methods: `generateQuote()`, `rewriteNotes()`, `draftEmail()`, `improveInvoiceDescriptions()`, `generateJobSummary()`

## Integration Points

### Web (`service-hub-app`)

| Feature | File | Trigger |
|---------|------|---------|
| Quote Writer | `src/components/QuoteCreateForm.jsx` | ClampButton → `aiService.generateQuote()` |
| Note Rewriter (quotes) | `src/components/QuoteCreateForm.jsx` | ClampRewriteButtons → `aiService.rewriteNotes()` |
| Note Rewriter (invoices) | `src/components/InvoiceDetailView.jsx` | ClampRewriteButtons → `aiService.rewriteNotes()` |
| Note Rewriter (internal) | `src/components/invoices/InvoiceSidebarCards.jsx` | ClampRewriteButtons → `aiService.rewriteNotes()` |
| Invoice Descriptions | `src/components/invoices/InvoiceLineItemsCard.jsx` | ClampButton → `aiService.improveInvoiceDescriptions()` |
| Email Drafter | `src/components/settings/EmailTemplatesTab.jsx` | ClampButton → `aiService.draftEmail()` |

### Mobile (`service-hub-mobile`)

| Feature | File | Trigger |
|---------|------|---------|
| Quote Writer | `src/screens/quotes/QuoteCreateScreen.js` | ClampButton → `generateQuote()` |
| Job Summary | `src/screens/jobs/JobDetailScreen.js` (NotesTab) | ClampButton → `generateJobSummary()` |

## On My Way — Dual Send

**File:** `src/components/jobs/OnMyWayButton.js` (mobile)

Two send paths:
1. **Send via Scaffld** — writes `{ onMyWay: true, onMyWayTechName, onMyWayEta }` to job doc → triggers `onMyWayNotification` Cloud Function → sends via Twilio (if configured)
2. **Open SMS App** — opens native SMS via `expo-linking` with pre-filled message → logs to `messages` collection

The Cloud Function (`functions/sms.js`) reads Twilio credentials from `users/{uid}/settings/companyDetails` → `integrations.twilio`.

## Placement Rules

- Clamp features sit **beside** the field they enhance, never in a separate panel or page
- Trigger button is always a `ClampButton` with a short, specific label ("Ask Clamp", "Clamp Improve", "Clamp Draft")
- Results appear inline below the trigger, not in a modal (web) or in a bottom sheet (mobile)
- User must explicitly accept or dismiss every AI result

## Rules

1. **Never duplicate AI logic.** All AI calls go through `aiService` → `scaffldAI` Cloud Function → Anthropic API.
2. **Never hardcode prompts in frontend.** System prompts live in `functions/prompts.js` only.
3. **Never add a new AI action** without updating `functions/prompts.js` + `functions/ai.js` + `aiService.js`.
4. **Amber, not purple.** Use Clamp colour tokens. Never `#A78BFA` or violet.
5. **ClampIcon, not sparkles.** Never use ✨ emoji for AI features.
6. **Error handling:** Always try/catch, show feedback via toast. Never expose raw API errors.
7. **Offline:** AI features require network. Check connectivity before calling on mobile.
8. **Dead code:** The old `rewriteText()` in `src/utils/textUtils.js` is dead — do not use it.

## Find-and-Replace Reference

When migrating existing code:

| Old | New |
|-----|-----|
| `AIAssistButton` | `ClampButton` |
| `AIResultPreview` | `ClampResultPreview` |
| `AIRewriteButtons` | `ClampRewriteButtons` |
| `src/components/common/AI*` | `src/components/clamp/*` |
| `#A78BFA` / `purple-*` / `violet-*` | Clamp amber tokens |
| `✨` (in AI contexts) | `<ClampIcon />` |
| `"AI Assist"` | `"Ask Clamp"` |
| `"Working..."` | `"Clamp is working..."` |
| `"AI Result"` / `"AI Rewrite"` | `"Clamp Result"` / `"Clamp Rewrite"` |
| `"Generating..."` | `"Clamp is working..."` |
