# Great Books AI Reading Companion — Claude Code Instructions

Read this file at the start of every session, every loop. Then read `TODO.md` for current task status.
Do not skip this step. The project conventions here override any default instincts you have about how to build things.

---

## What This Project Is

A literary enrichment app for reading Paradise Lost. The product thesis is called **contextual collapse**: modern readers lack the historical, theological, and classical knowledge that Milton's 1667 audience already possessed. The app restores that context — inline, on demand, calibrated to the reader's level.

This is not a summary tool. It is not a quiz. It does not spoil. It enriches.

The target user is someone who wants to read seriously but doesn't have a classics education. The tone is a brilliant, well-read friend sitting next to them — not a textbook, not Wikipedia.

The product is being built as a demo to send to **Johnathan Bi**, founder of GreatBooks.io. The demo link is the goal. Everything should serve that goal.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router) |
| Styling | Tailwind v4 |
| Language | TypeScript — strict, no `any` |
| AI | OpenRouter → `anthropic/claude-sonnet-5` |
| Database | Supabase (Postgres) |
| Deployment | Vercel |

Environment variables assumed to exist in `.env.local`:
- `OPENROUTER_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

If you encounter a missing env var, assume it exists and proceed. Do not add fallback mock logic.

---

## Directory Structure

```
/app
  page.tsx                    — Main reading view (ReadingContainer)
  /api
    /annotate/route.ts        — Inline passage enrichment (streaming SSE)
    /chat/route.ts            — Chat panel messages (streaming SSE)
    /primer/route.ts          — Book-level foreword (streaming SSE, cached)
    /section-primer/route.ts  — Section before/after cards (streaming SSE, cached)
    /vocab/route.ts           — Vocab card data for hover tooltips
    /annotations/route.ts     — Annotation history persistence
    /section-progress/route.ts — Section completion tracking

/components
  Reader.tsx                  — Poem rendering, selection, line highlighting, pagination
  SectionCard.tsx             — Before/after cards per section (lazy loaded via IntersectionObserver)
  AnnotationCard.tsx          — Floating enrichment card (streaming, Esc to close)
  AnnotationHistory.tsx       — Bottom-left journal drawer of past enrichments
  Chat.tsx                    — Persistent right-panel chat (streaming)
  AchievementToast.tsx        — Slide-in achievement notifications

/lib
  paradise-lost.ts            — Book 1 text, 798 lines, structured
  sections.ts                 — BOOK_1_SECTIONS array: id, title, lineStart, lineEnd, beforePrompt, afterPrompt
  prompts.ts                  — All AI system prompts (KnowledgeLevel type, getPrimerPrompt, getChatSystemPrompt)
  supabase.ts                 — Supabase client factory (server + browser)
  card-cache.ts               — cachedContentStream + withCaching helpers for SSE caching

/supabase
  /migrations                 — SQL migration files (do not edit manually, use migration files)
```

---

## Architecture Patterns

### Streaming (SSE)

Every AI call streams. This is non-negotiable. The pattern is identical across all routes:

1. Check cache in Supabase (`section_card_cache` table, keyed by a stable string)
2. Cache hit → return `cachedContentStream(content)` as SSE
3. Cache miss → call OpenRouter with `stream: true`, pipe through `withCaching(body, key, supabase)`
4. Always return `Content-Type: text/event-stream`

Study `/api/annotate/route.ts` before touching any AI route. Mirror it exactly. Do not invent a new streaming pattern.

### AI Model

Always use: `anthropic/claude-sonnet-5`
Sampling parameters are model-managed (Sonnet 5 ignores `temperature`, `top_p`, and `top_k`)
Max tokens: `800` for cards/primers, `10000` for chat

### Knowledge Levels

Three levels defined in `lib/prompts.ts`:
- `noob` — Complete beginner, no classical or theological background
- `casual` — Some cultural literacy, needs context not explanation
- `scholar` — Advanced reader, wants depth and scholarly interpretation

The `[LEVEL]` placeholder in `beforePrompt` and `afterPrompt` strings in `sections.ts` is resolved at runtime by replacing it with the full label from `KNOWLEDGE_LEVEL_LABELS`.

### Section Cards

`BOOK_1_SECTIONS` in `lib/sections.ts` defines 6 sections for Book 1. Each has:
- `beforePrompt`: shown before the reader sees the text (no spoilers — sets up context)
- `afterPrompt`: shown after the text (reflection, insight, literary analysis)

The `afterPrompt` always prepends: *"Your response must open with one plain sentence stating the narrative fact: what just happened, where we are in the poem."* This is injected in `route.ts`, not baked into the prompt strings.

Cards are loaded lazily via `IntersectionObserver` — they do not fetch until they scroll into view.

### Caching Strategy

Section cards and primers are cached in the `section_card_cache` Supabase table.
Cache key format: `section:{sectionId}:{cardType}:{level}` (e.g. `section:b1s1:before:noob`)
Do not cache chat or annotation responses — those are contextual.

### Session & Progress

Reading progress is tracked via a `gb_session` cookie (anonymous). Do not require auth for any MVP feature. The `section_progress` table records which sections are complete per session. Achievements are stored in `achievements`, `reading_streaks`, and `session_achievements` tables.

---

## Design System

This is a literary product. Treat every UI decision as a typography and editorial decision, not a software UI decision.

### Palette
```
Background:      #0d0d0e  (near-black)
Text primary:    #f0ebe2  (warm cream)
Text secondary:  #8a847a  (muted warm grey)
Text tertiary:   #4a4540  (very muted, line numbers, dividers)
Gold accent:     #c9a84c  (enrichment actions, current state, CTAs)
Surface:         #1c1b18  (cards, panels, slightly lifted from bg)
Border subtle:   #2a2820  (dividers, inactive borders)
```

### Typography
- **Serif body** (poem text, prose): `var(--font-lora), Georgia, 'Times New Roman', serif`
- **Display serif** (headings, cards): `var(--font-cormorant), Georgia, 'Times New Roman', serif`
- **No sans-serif.** No Inter. No system-ui. If it looks like a SaaS product, it's wrong.

### Component Rules
- No generic card borders with visible backgrounds unless content is clearly floating (e.g. AnnotationCard)
- No purple. No blue. No gradients of any kind.
- Buttons: sparse, serif, gold for primary action, muted grey for secondary
- Hover states: subtle — border-color shift, slight background lift. No transforms, no shadows on text.
- Loading states: pulsing opacity, not spinners

### Spacing
The reading column sits inside a constrained max-width (~680px content + 460px chat panel). Line height for poem text is `1.85`. Do not compress this.

---

## What Has Been Built (Session Log)

- **Session 1** — Next.js init, text loading (798 lines), basic reading view, knowledge toggle
- **Session 2** — Inline annotation: selection → ✦ Enrich button → streaming AnnotationCard
- **Session 3** — Section primer (foreword above text), Chat panel (desktop sidebar, mobile drawer)
- **Session 4** — Supabase schema, seed script, vocab cards (hover tooltips), annotation history persistence
- **Session 5** — Section structure (6 named sections), before/after SectionCards, IntersectionObserver lazy loading, section_progress tracking
- **Session 6** — ProgressBar (2px fixed top), AnnotationHistory drawer, gamification (streaks, achievements, toasts)

**Recent additions (not yet in session log):**
- "Ask in Chat" button on text selection (pre-fills chat textarea with quoted passage)
- Smart scroll lock in chat (only auto-scrolls if within 60px of bottom)
- After cards now open with a narrative grounding sentence before insight
- Chat panel width: 460px
- Pagination: Reader now shows one section at a time with Prev/Next navigation and dot indicators

---

## Current Known Issues / Backlog

- Section card content sometimes truncates mid-sentence (primer and after card cut off) — likely a max_tokens issue or stream termination; investigate `withCaching` and token limits
- Vocab words are sometimes miscalibrated: marks common words ("visible", "invoke"), misses archaic ones ("durst")
- `onSectionVisible` callback was built for scroll-based detection — with pagination now in place, it should fire immediately when a section becomes active, not on scroll
- Chat closing question ("What drew you to that angle?") — LLMs tend to append questions; the system prompt should be more explicit about when this is appropriate vs. annoying

---

## Constraints — Non-Negotiable

**Never summarise or spoil.** The before cards prepare, the after cards reflect. Neither reveals what happens next.

**Never touch working features without cause.** If annotation is working, do not refactor it. If chat streams correctly, do not rewrite it. Scope your changes to what is asked.

**All AI prompts live in `lib/prompts.ts` or `lib/sections.ts`.** Do not hardcode prompt strings in route files. Do not modify existing prompts without explicit instruction.

**TypeScript must stay clean.** Run `npx tsc --noEmit` before considering any session complete. Fix all errors. No `@ts-ignore`.

**`npm run build` must pass.** Do not leave the project in a broken build state.

**Streaming is the pattern.** Do not introduce `await`-based full-response AI calls. The reader should see text appearing, not wait for it.

---

## How to Start Each Session

1. Read this file (`CLAUDE.md`)
2. Read `TODO.md` — identify what is checked and what is not
3. Check the current state of the file(s) you're about to touch — do not assume, read
4. Make targeted changes only. Do not reorganise working files.
5. After completing work: run `npx tsc --noEmit`, then `npm run build`
6. Update `TODO.md` session log

---

## Definition of Demo-Ready

- [ ] Deployed to Vercel with a public URL
- [ ] Pagination working (one section per page, Prev/Next navigation)
- [ ] Before/after cards loading and not truncating
- [ ] Chat functional with streaming, no forced closing questions
- [ ] Vocab tooltips calibrated (archaic words flagged, common words excluded)
- [ ] `npm run build` passes clean
- [ ] Looks good enough to screenshot — no unfinished UI visible to the reader