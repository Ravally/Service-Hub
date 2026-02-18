# CLAMP — AI Feature Registry

Before starting ANY task that touches AI features, read this file first.
This is the single source of truth for what AI exists, where it lives, and how it works.

## Cloud Function: `scaffldAI`

**File:** `functions/ai.js`
**Type:** Firebase callable (`functions.https.onCall`)
**Model:** claude-sonnet-4-20250514 via @anthropic-ai/sdk
**API key:** `functions.config().anthropic.key` (migrate to `.env` before March 2026)

### Actions

| Action | Prompt file | Input | Output |
|--------|------------|-------|--------|
| `quoteWriter` | `functions/prompts.js` | Free-text job description | JSON array: `[{description, quantity, unit, unitPrice}]` |
| `noteRewrite` | `functions/prompts.js` | `Tone: {tone}\n\n{notes}` | Rewritten text |
| `emailDraft` | `functions/prompts.js` | Template context + prompt | Email body text |
| `invoiceDescription` | `functions/prompts.js` | Brief line item descriptions | JSON array of improved strings |
| `jobSummary` | `functions/prompts.js` | Job data summary | Completion summary text |

## Web App (`service-hub-app`) — AI Integration Points

| Feature | File | Component/Function | How it calls AI |
|---------|------|--------------------|-----------------|
| AI Quote Writer | `src/components/QuoteCreateForm.jsx` | `handleAiGenerate()` | `aiService.generateQuote()` |
| AI Note Rewriter (quotes) | `src/components/QuoteCreateForm.jsx` | `<AIRewriteButtons>` | `aiService.rewriteNotes()` |
| AI Note Rewriter (invoices) | `src/components/InvoiceDetailView.jsx` | `<AIRewriteButtons>` | `aiService.rewriteNotes()` |
| AI Note Rewriter (internal) | `src/components/invoices/InvoiceSidebarCards.jsx` | `<AIRewriteButtons>` | `aiService.rewriteNotes()` |
| AI Invoice Descriptions | `src/components/invoices/InvoiceLineItemsCard.jsx` | `handleImproveDescriptions()` | `aiService.improveInvoiceDescriptions()` |
| AI Email Drafter | `src/components/settings/EmailTemplatesTab.jsx` | `handleAiGenerate()` | `aiService.draftEmail()` |

### Shared AI Components

| Component | File | Purpose |
|-----------|------|---------|
| `AIAssistButton` | `src/components/common/AIAssistButton.jsx` | Sparkle-icon trigger button (purple, sm/md variants) |
| `AIResultPreview` | `src/components/common/AIResultPreview.jsx` | Preview panel with Use/Retry/Keep Original actions |
| `AIRewriteButtons` | `src/components/common/AIRewriteButtons.jsx` | 4 tone buttons (Cheerful/Casual/Professional/Shorter) + inline preview |

### Frontend Service

**File:** `src/services/aiService.js`
**Calls:** `httpsCallable(functions, 'scaffldAI')` with `{ action, input }`
**Methods:** `generateQuote()`, `rewriteNotes()`, `draftEmail()`, `improveInvoiceDescriptions()`, `generateJobSummary()`

## Mobile App (`service-hub-mobile`) — AI Integration Points

| Feature | File | How it calls AI |
|---------|------|-----------------|
| AI Quote Writer | `src/screens/quotes/QuoteCreateScreen.js` | `generateQuote()` from aiService |
| AI Job Summary | `src/screens/jobs/JobDetailScreen.js` (NotesTab) | `generateJobSummary()` from aiService |

### Frontend Service

**File:** `src/services/aiService.js`
**Calls:** `fetch(FUNCTIONS_BASE_URL/scaffldAI)` with Bearer auth token + `{ data: { action, input } }`
**Methods:** `generateQuote()`, `generateJobSummary()`, `rewriteNotes()`

## Rules

1. **Never duplicate AI logic.** All AI calls go through `aiService` -> `scaffldAI` Cloud Function -> Anthropic API.
2. **Never hardcode prompts in frontend.** System prompts live in `functions/prompts.js` only.
3. **Never add a new AI action** without adding it to the `prompts` object in `functions/prompts.js` and the `switch` in `functions/ai.js`.
4. **AI UI styling:** Purple theme (`#A78BFA` / violet-400). Use `AIAssistButton` and `AIResultPreview` on web; match the purple Card pattern on mobile.
5. **Error handling:** Always try/catch, show user-friendly toast on failure. Never expose raw API errors.
6. **The old `rewriteText()` in `src/utils/textUtils.js` is dead code.** Do not use it. It was a fake string-prepend function replaced by real AI in Phase 2.
