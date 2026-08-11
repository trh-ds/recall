# Recall — Build TODO

> Source of truth: `AGENT.md` (rules/architecture) + `PRD.md` (features F1–F7) +
> `CLAUDE_CODE_BUILD_PROMPT.md` (phase order). This file tracks execution status.
> Convention: check a box only after **you've tested it and confirmed it works.**

## Status — 2026-08-11

**Phases 0–2 done and verified on-device.** Next up: Phase 3 (services & permissions).

Runs on a Xiaomi 23124RN87I (Android 15) dev build. **Expo Go is no longer usable** —
MMKV, and every Phase 3 module, are native. Always `npx expo run:android`.

What exists:
- `src/llm/index.ts` — one OpenAI-compatible client for all three providers, failover
  chain, JSON-mode helper with repair retry, content-free latency/token log.
- `src/db/index.ts` — SQLite schema + `user_version` migrations, query helpers,
  DPDP export/delete. `src/db/kv.ts` — MMKV settings + consent gate.
- `src/app/llm-test.tsx`, `src/app/db-test.tsx` — dev screens that double as the test
  suite (no test runner in the project). DB self-check: 11/11 passing.

Verified working: Groq end-to-end, failover fallthrough on a missing key, all 11 DB
checks. Unverified: NIM and Gemini clients (no keys yet), export/delete functions.

Traps already hit, so they don't get re-hit:
- The old scaffold pinned `expo-sqlite@~16.0.8`. SDK 57 renumbered it to `57.x`, and
  16.x crashes before JS starts (`NoClassDefFoundError: AnyTypeProvider`). If a native
  module dies on launch with no Metro output: `adb logcat -b crash -d`, then
  `npx expo install --check`.
- Keys go in `.env` only. `.env.example` is tracked — a real key there ships to GitHub.
- Never sideload `android/app/build/outputs/apk/release/` on Xiaomi; HyperOS rejects it
  as "security reinforcement". Debug APK only.

---

## Phase 0 — Scaffold ✅
- [x] Move scaffold to repo root (`app/`, `src/`) — stop nesting under `_scaffold/`
- [x] Fix broken root screen (remove missing-component imports, minimal working home)
- [x] Create dir layout per AGENT.md: `src/agent`, `src/llm`, `src/services`, `src/db`,
      `src/features`, `src/components`, `src/hooks`, `src/store`, `src/types`
- [x] `.env.example` (NIM/Groq/Gemini keys + model names, no real values)
- [x] Typed config loader (`src/llm/config.ts` or similar) reading from env
- [x] `CLAUDE.md` that imports `@AGENT.md @PRD.md` (so future sessions auto-load context)
- [x] `npm run typecheck` and `npm run lint` both pass

## Phase 1 — LLM layer ✅
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

## Phase 2 — Data & storage ✅
- [x] SQLite schema/migrations: notes/captures, deadlines, timetable,
      notifications-log, metrics — 5 tables, `PRAGMA user_version` migrations.
      `events(name, day)` covers all of Phase 7 on its own. **Verified via /db-test**
- [x] MMKV for settings/flags/consent-state (`src/db/kv.ts`, `consent` gate for Phase 4)
- [x] Typed query helpers — scoped to the tools Phase 5 will call. **Verified via /db-test**
- [x] Export-all-data function (DPDP right) — `exportAllData()` returns JSON; writing it
      to a file needs `expo-file-system`, add with the settings screen in Phase 4
- [x] Delete-all-data function (DPDP right) — `deleteAllData()` + `withdrawConsent()`

Open from Phase 2:
- [ ] Exercise `exportAllData()` / `deleteAllData()` once — the /db-test self-check
      deliberately skips them (delete wipes the DB). Test behind the Phase 4 settings UI.
- [ ] No indexes yet. Add via a migration when a query is measurably slow, not before.

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
