# Great Books AI Reading Companion
## Project TODO & Scope

**The pitch in one sentence:** Restore modern readers to the position of the original intended reader - giving them the contextual knowledge that Milton's 1667 audience already had.

**Demo target:** A working link to send to Johnathan Bi (Great Books / GreatBooks.io) that shows the idea, not just describes it.

**Stack:** Claude Code / Claude API, OpenRouter, Supabase, Vercel

---

## What GOOD looks like

The experience should feel like having a brilliant, well-read friend sitting next to you while you read - not a textbook, not Wikipedia, not a summary. The tone of annotations should match Johnathan's brand: intellectually serious, but alive and conversational.

A user should be able to open the app, start reading Book 1 of Paradise Lost, and within 60 seconds have a "wow, I never would have gotten that without this" moment.

---

## Features

### 🔴 MUST HAVE (MVP - build this week)

- [ ] **Clean reading view** - Paradise Lost Book 1 displayed in a beautiful, distraction-free format. Typography matters here. This is a literary product.
- [ ] **Inline annotation on click** - User clicks/selects any word, phrase, or line and gets a contextual enrichment card. Should answer: "what would a 1667 reader have understood here that I don't?"
- [ ] **Section primer** - Before the text begins, a spoiler-free briefing: historical moment (English Civil War, Restoration), Milton's biography, classical and theological background needed to appreciate the poem. ~300 words, punchy.
- [ ] **Chat interface** - Persistent chat panel to discuss ideas, ask questions, explore interpretations. Context-aware (knows what book you're reading).
- [ ] **Prompt engineering pass** - The annotation quality IS the product. Annotations must feel intellectually serious. Run a dedicated prompt refinement session before launch.

### 🟡 SHOULD HAVE (if time allows before sending demo)

- [ ] **Annotation history / sidebar** - Save clicked annotations so the user can review what they've explored in a session
- [ ] **"What's the significance?" mode** - Beyond context, offer a layer of *why this passage matters* to the work as a whole (without spoilers)
- [ ] **Mobile-friendly layout** - A lot of reading happens on phones
- [ ] **Loading states that feel good** - Streaming responses, not a spinner. The wait should feel like the AI is thinking, not buffering.

### 🟢 FUTURE / POST-DEMO (if Johnathan bites)

- [ ] **Multiple books** - Expand beyond Paradise Lost. Natural candidates: Iliad, Divine Comedy, Hamlet, Moby Dick, War and Peace
- [ ] **User accounts + reading progress** - Supabase auth, bookmark where you are, save annotations across sessions
- [ ] **Great Books curriculum layer** - Tie the reading experience to Johnathan's podcast episodes. "Johnathan discussed this passage in Episode X"
- [ ] **Community annotations** - Let readers contribute their own contextual notes (Genius-style)
- [ ] **Difficulty / depth settings** - "Just the basics" vs "Give me everything"
- [ ] **Export annotations** - Save your enriched reading as notes (great for students)
- [ ] **Audio primer** - A short podcast-style intro to each section, consistent with Johnathan's format

---

## What NOT to build (stay disciplined)

- ❌ Summaries or plot spoilers - this is about enriching the reading, not replacing it
- ❌ Quizzes or gamification - wrong tone for this audience
- ❌ Social features in MVP - distraction
- ❌ Multiple books before Book 1 is excellent - depth over breadth

---

## Definition of "demo-ready"

- [ ] Deployed on Vercel with a public URL
- [ ] Book 1 of Paradise Lost fully loaded and readable
- [ ] Inline annotation working on at least 20+ key passages (pre-loaded or AI-generated on click)
- [ ] Section primer live and well-written
- [ ] Chat functional with good system prompt
- [ ] Looks good enough to screenshot - UI should not embarrass the idea

---

## The email (send after demo is live)

Short. Confident. Lead with the Austin connection. Drop the link early. No over-explaining.
Reference a specific piece of Johnathan's content that genuinely landed. Let the demo speak.

---

## Session log

*Use this section to track what was built each Claude Code session*

- [x] Session 1 - Project setup, Vercel + Supabase init, text loaded, basic reading view
- [x] Session 2 - Inline annotation feature (ReadingContainer, AnnotationCard, /api/annotate streaming, prompt quality pass)
- [x] Session 3 - Section primer + chat interface (/api/primer streaming GET, /api/chat streaming POST, Primer.tsx foreword, Chat.tsx desktop sidebar + mobile drawer)
- [ ] Session 4 - Prompt engineering pass, UI polish, deploy
- [x] Session 5 - Section structure: 6 named sections (b1s1–b1s6), before/after SectionCards with lazy IntersectionObserver loading, section_progress Supabase table + API routes, progress persisted via gb_session cookie
- [x] Session 7 - Demo-hardening: new Supabase project wired up (`.env` key renamed to match code), "Complete Noob" → "Newcomer", retry buttons on all card/annotation error states, guided first-enrichment hint on line 63 ("darkness visible"), OG image (`app/opengraph-image.png` + metadataBase/twitter card), mobile fixes (KnowledgeToggle double-render bug, tap-a-line-to-enrich fallback for touch devices), `scripts/warm-cache.ts` + `npm run warm`. Pending: SUPABASE_SERVICE_ROLE_KEY (seed + cache writes blocked by RLS), Vercel env update, real-iPhone selection test.
- [x] Session 6 - Reading progress visibility (ProgressBar 2px fixed top, current section label), annotation history drawer (AnnotationHistory bottom-left journal panel), gamification foundations (reading_streaks + achievements + session_achievements tables, upsert_reading_streak SQL function, checkAndUnlockAchievements), achievement toasts (AchievementToast slide-in, 4s auto-dismiss, queue support)
- [x] Session 8 - Upgraded all runtime AI routes from Claude Sonnet 4.6 to Claude Sonnet 5, removed unsupported sampling parameters, and versioned primer/card caches for regeneration.