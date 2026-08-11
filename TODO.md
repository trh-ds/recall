# Recall — Build TODO

> Source of truth: `AGENT.md` (rules/architecture) + `PRD.md` (features F1–F7) +
> `CLAUDE_CODE_BUILD_PROMPT.md` (phase order). This file tracks execution status.
> Convention: check a box only after **you've tested it and confirmed it works.**

## Current state (audit before starting)
- `_scaffold/` exists but is **not usable as-is**: it's a partial `create-expo-app`
  template — `src/app/index.tsx` and `_layout.tsx` import components
  (`animated-icon`, `hint-row`, `web-badge`, `app-tabs`) and a package (`expo-device`)
  that were never added. It would not build. Plan: replace its welcome screen with a
  minimal working root layout instead of chasing the missing files, keep the
  dependency choices (expo-sqlite, mmkv, zustand) that are already in `package.json`.
- Nothing is committed to git yet (`_scaffold/` is untracked).
- No `CLAUDE.md` — Claude Code won't auto-load `AGENT.md`/`PRD.md` in future sessions
  unless one exists.

---

## Phase 0 — Scaffold
- [ ] Move scaffold to repo root (`app/`, `src/`) — stop nesting under `_scaffold/`
- [ ] Fix broken root screen (remove missing-component imports, minimal working home)
- [ ] Create dir layout per AGENT.md: `src/agent`, `src/llm`, `src/services`, `src/db`,
      `src/features`, `src/components`, `src/hooks`, `src/store`, `src/types`
- [ ] `.env.example` (NIM/Groq/Gemini keys + model names, no real values)
- [ ] Typed config loader (`src/llm/config.ts` or similar) reading from env
- [ ] `CLAUDE.md` that imports `@AGENT.md @PRD.md` (so future sessions auto-load context)
- [ ] `npm run typecheck` and `npm run lint` both pass

## Phase 1 — LLM layer
- [x] `LLMProvider` interface (single `complete()` method)
- [x] NVIDIA NIM client — *config only, unverified (no key yet)*
- [x] Groq client — **verified on-device**
- [x] Gemini Flash client — *config only, unverified (no key yet)*
- [x] Failover chain NIM → Groq → Gemini (rate-limit/error/timeout fallthrough)
      — verified via missing-key fallthrough nim → groq; HTTP-error/timeout paths untested
- [x] JSON-only structured-output helper + parse-and-repair retry
- [x] Local token/latency logging (no user content logged)
- [x] Test screen to fire a prompt and observe failover (`src/app/llm-test.tsx`)

Open from Phase 1:
- [ ] Add NIM + Gemini keys, confirm both clients actually respond
- [ ] Decide chain order — recommendation is Groq primary (rate-limited not
      credit-metered, lowest latency), Gemini second (long context for F6), NIM third.
      One-line change in `src/llm/config.ts`.

## Phase 2 — Data & storage
- [ ] SQLite schema/migrations: notes/captures, deadlines, timetable,
      notifications-log, metrics (daily opens, feature-triggered-open, week-4 retention)
- [ ] MMKV for settings/flags/consent-state
- [ ] Typed query helpers
- [ ] Export-all-data function (DPDP right)
- [ ] Delete-all-data function (DPDP right)

## Phase 3 — Services & permissions
- [ ] Notification listener (`react-native-android-notification-listener`)
- [ ] Calendar (`react-native-calendar-events`)
- [ ] Voice → text (`@react-native-voice/voice`)
- [ ] Text → voice (`expo-speech`)
- [ ] Local notifications (`expo-notifications`)
- [ ] Background tasks (`expo-task-manager` + `expo-background-fetch`)
- [ ] Each permission requested in-context with plain-language rationale

## Phase 4 — Consent & onboarding
- [ ] First-launch DPDP consent screen (what's read, what's sent to LLMs)
- [ ] No processing before consent given
- [ ] Consent state stored (MMKV), withdrawal purges data

## Phase 5 — Agent loop + tools
- [ ] Agent loop (trigger → context → LLM picks tool+args JSON → run tool → glanceable result)
- [ ] Tool: `getNextClass`
- [ ] Tool: `listDeadlines`
- [ ] Tool: `addDeadline`
- [ ] Tool: `captureNote`
- [ ] Tool: `summariseText`
- [ ] Tool: `searchNotes` (keyword + recency)
- [ ] Tool: `classifyNotification`
- [ ] Tool: `buildDailyBriefing`
- [ ] Write/act tools routed through autonomy gate (default Suggest)

## Phase 6 — MVP features (test each on-device/emulator before checking off)
- [ ] **F1 — Daily briefing** (P0, anchor habit): morning summary + evening wrap
- [ ] **F2 — Deadline & assignment tracker** (P0): proactive countdown reminders
- [ ] **F3 — Voice quick-capture** (P0): speak → transcribe → auto-tag → recall
- [ ] **F4 — Notification triage** (P1): filter noise vs. what matters
- [ ] **F5 — Timetable "what's next"** (P1): next class/room/prep at a glance
- [ ] **F6 — Ask-my-notes + PDF summariser** (P1): summarise + Q&A over notes
- [ ] **F7 — Exam-prep countdown** (P2): spaced study nudges

## Phase 7 — Retention instrumentation
- [ ] Track daily-active return locally
- [ ] Track which feature drove each open
- [ ] Track week-4 retention
- [ ] Daily briefing wired as the measured anchor event

---

## Working agreement
- One feature/phase at a time. After each: run typecheck/lint, summarize the diff,
  **tell you exactly what to do to test it**, wait for your confirmation before
  checking the box and moving on.
- No new dependencies outside AGENT.md §3's list without flagging why first.
- Any conflict with an AGENT.md golden rule → stop and flag, don't silently proceed.
