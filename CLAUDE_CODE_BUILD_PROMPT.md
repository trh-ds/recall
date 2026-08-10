# Claude Code — Build Prompt for Recall (MVP)

> Paste this into Claude Code from the root of an empty repo that already contains
> `AGENT.md` and `PRD.md`. It kicks off the MVP build in phases.

---

```
You are building the MVP for "Recall" (working name), an agentic AI personal assistant.

FIRST, before writing any code:
- Read AGENT.md in full — it holds the golden rules, architecture, and constraints.
- Read PRD.md — it holds the product spec, MVP feature list (F1–F7), and success metric.
Treat both as the source of truth. If anything I say conflicts with a golden rule in
AGENT.md, stop and flag it instead of silently proceeding.

WHAT WE ARE BUILDING
An Android app (React Native + Expo, TypeScript) that runs ENTIRELY on-device — no backend,
no cloud DB, no auth server. The only network calls are direct requests to free LLM APIs
(NVIDIA NIM primary, Groq for speed, Gemini Flash for long context), behind one provider
abstraction with automatic failover. It ships free to student testers to validate a
daily-retained habit loop.

NON-NEGOTIABLES (from AGENT.md — obey these):
- On-device only. Do not add a server, Supabase, Firebase, or any hosting dependency.
- Never hardcode API keys. Read them from an untracked .env via a config module; commit only
  .env.example. Assume keys in the build are extractable, so document that only restricted,
  low-quota keys should be used.
- The agent SUGGESTS and CONFIRMS; it never sends/posts/deletes anything without explicit
  user confirmation (graduated autonomy, default = Suggest).
- Privacy is the product: data stays local; send only the minimum text to an LLM; show a
  DPDP-compliant consent notice on first launch before any processing.
- No LangChain / vector DB / heavyweight orchestration in the MVP. Keep the agent loop a
  small, typed TypeScript function.

HOW TO WORK
- Build in the phases below. After each phase: run typecheck + lint, give me a short summary
  of what changed and why, and STOP for my review before starting the next phase.
- Keep PRs/commits small and single-purpose.
- Prefer clarity over cleverness. Explain any non-obvious decision in a code comment.

PHASE 0 — Scaffold
- Initialise an Expo + TypeScript (strict) project with expo-router.
- Set up the directory layout from AGENT.md (src/agent, src/llm, src/services, src/db,
  src/features, src/components, src/hooks, src/store, src/types).
- Add Zustand, expo-sqlite, react-native-mmkv. Add lint + typecheck scripts.
- Create .env.example (NIM/Groq/Gemini keys + model names) and a typed config loader.

PHASE 1 — LLM layer
- Define an LLMProvider interface with one complete() method.
- Implement NVIDIA NIM, Groq, and Gemini clients (all OpenAI-compatible; differ by baseURL,
  apiKey, model).
- Implement a failover chain NIM → Groq → Gemini (on rate-limit/error/timeout), with roles:
  NIM = default reasoning, Groq = low-latency voice, Gemini = long-context summarising.
- Add a JSON-only structured-output helper with a parse-and-repair retry.
- Log token/latency locally only. Include a tiny test screen to fire a prompt and see failover work.

PHASE 2 — Data & storage
- SQLite schema + migrations for: notes/captures (with tags, timestamp, source), deadlines,
  timetable, notifications-log, and a local metrics table (daily opens, feature-triggered-open,
  week-4 retention).
- MMKV for settings/flags/consent-state.
- Typed query helpers. Export-all-data and delete-all-data functions (DPDP rights).

PHASE 3 — Services & permissions
- Notification listener (react-native-android-notification-listener), calendar
  (react-native-calendar-events), voice→text (@react-native-voice/voice), text→voice
  (expo-speech), local notifications (expo-notifications), background tasks
  (expo-task-manager + expo-background-fetch).
- Request each permission in-context with a plain-language rationale shown first.

PHASE 4 — Consent & onboarding
- First-launch DPDP consent screen: plain language, itemises what Recall reads
  (notifications, calendar, mic when invoked) and that text may be sent to third-party LLM
  providers for processing. No processing until consent is given. Store consent state.

PHASE 5 — Agent loop + tools
- Small typed agent loop (trigger → build on-device context → LLM picks a registered tool +
  args as JSON → run tool → glanceable result → optional speak).
- Register MVP tools: getNextClass, listDeadlines, addDeadline, captureNote, summariseText,
  searchNotes (keyword + recency), classifyNotification, buildDailyBriefing.
- Route any write/act tool through the autonomy gate (default Suggest).

PHASE 6 — MVP features (see PRD F1–F7), in priority order
- P0: F1 Daily briefing (the anchor habit), F2 Deadline & assignment tracker, F3 Voice
  quick-capture.
- P1: F4 Notification triage, F5 Timetable "what's next", F6 Ask-my-notes + PDF summariser.
- P2: F7 Exam-prep countdown.
- UI: glanceable cards, voice-first, ~2-second readability, as if already on a wrist.

PHASE 7 — Retention instrumentation
- Wire the local metrics: daily-active return, which feature drove each open, week-4 retention.
- Make the daily briefing the measurable anchor.

Start with PHASE 0. Confirm you've read AGENT.md and PRD.md, then scaffold and stop for review.
```

---

**Notes**

- Claude Code auto-loads `CLAUDE.md` by default. Either rename `AGENT.md` → `CLAUDE.md`, or
  add a line in `CLAUDE.md` that says `@AGENT.md @PRD.md` to import them.
- Run this phase-by-phase; don't let it one-shot the whole app — you want to review the LLM
  failover and the consent flow yourself.
