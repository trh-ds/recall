# AGENT.md — Recall

> Working name: **Recall** (not final). Agent context for building the MVP.
> Read this fully before writing any code. Read `PRD.md` for the product spec.

---

## 1. What Recall is

Recall is an **agentic AI personal assistant** — not a chatbot. It takes action on the
user's behalf: triages notifications, captures and organises tasks, tracks deadlines,
summarises documents, and delivers a proactive daily briefing.

The long-term vision is a **wrist-worn** assistant. **This repo is NOT that.** This repo is
the **MVP: an Android app**, shipped free to student testers to validate one thing —
whether people return to an agentic assistant *every day*. Hardware comes only after that
is proven.

**Prime directive for this codebase:** build the smallest thing that creates a
**daily-retained habit loop**. Every feature is judged by whether it earns a daily open.

---

## 2. Golden rules (non-negotiable)

1. **No cloud backend in the MVP.** All logic, storage, and the agent loop run
   **on-device**. The only network calls are direct requests to free LLM provider APIs.
   Do not add a server, do not add Supabase/Firebase, do not introduce a hosting dependency.
2. **Never hardcode production API keys.** Keys live in an untracked `.env` / secure store.
   Use **restricted, low-quota** keys for test builds. Assume keys in a client build **can
   be extracted** — so no key that can run up a real bill ships in the APK.
3. **The agent suggests and confirms; it does not act silently.** Follow the
   **graduated-autonomy** model (§7). No irreversible or user-visible action (sending,
   posting, deleting) happens without explicit user confirmation.
4. **Privacy is the product, not a footnote.** Data stays on-device. The one exception —
   text sent to third-party LLM APIs for processing — must be disclosed to the user
   (§8, DPDP). Never send more than the minimum text needed for a task.
5. **Fail gracefully across providers.** LLM calls go through the provider abstraction with
   automatic failover (§6). A single provider being down or rate-limited must never break the app.
6. **Voice-first, glance-fast.** Interactions should work hands-free and be readable in a
   two-second glance. This discipline makes the later wrist port trivial.

---

## 3. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **React Native (Expo)** | Bare workflow only if a native module forces it |
| Language | **TypeScript** (strict) | No `any` without a comment justifying it |
| Navigation | expo-router | File-based |
| State | **Zustand** | Keep it light; no Redux |
| Local DB | **expo-sqlite** | Structured data (tasks, notes, deadlines, memory) |
| Key-value | **react-native-mmkv** | Settings, flags, small hot data |
| LLM calls | plain `fetch` | Through the provider abstraction in `src/llm` |
| Notifications (read) | `react-native-android-notification-listener` | Notification Listener permission |
| Local notifications | `expo-notifications` | Reminders, briefing delivery |
| Calendar | `react-native-calendar-events` | Read/write with permission |
| Voice → text | `@react-native-voice/voice` | Capture |
| Text → voice | `expo-speech` | Briefing readout |
| Background | `expo-task-manager` + `expo-background-fetch` | Proactive nudges & briefing build |
| PDF/doc text | `react-native-pdf` + text extraction | Then summarise via LLM |

Do not add libraries outside this list without noting why in the PR description.

---

## 4. Architecture

```
On-device only. No server.

┌──────────────────────────────────────────────┐
│  UI (expo-router screens, glanceable cards)   │
├──────────────────────────────────────────────┤
│  Agent loop  (plan → pick tool → run → speak) │
│  Tools: timetable, deadlines, capture,        │
│         summarise, searchNotes, triage,       │
│         buildBriefing                          │
├──────────────────────────────────────────────┤
│  LLM layer  (provider abstraction + failover) │
│     → NVIDIA NIM (primary)                     │
│     → Groq (speed)                             │
│     → Gemini Flash (long context)              │
├──────────────────────────────────────────────┤
│  Services: notifications · calendar · voice   │
│  Storage:  SQLite (structured) · MMKV (kv)    │
└──────────────────────────────────────────────┘
        │ network egress = ONLY LLM API calls │
```

### Suggested directory layout
```
recall/
  app/                # expo-router screens
  src/
    agent/            # agent loop + tool registry
    llm/              # provider clients, failover, prompts
    services/         # notifications, calendar, voice, background
    db/               # sqlite schema, migrations, queries
    features/         # briefing, tasks, capture, triage, summarise
    components/       # glanceable cards, primitives
    hooks/
    store/            # zustand slices
    types/
  AGENT.md
  PRD.md
  .env.example        # provider keys, no real values committed
```

---

## 5. The agent loop

Keep it simple — **no LangChain/LangGraph for the MVP**. A small TypeScript loop:

1. Take the trigger (user voice/text, or a scheduled background tick).
2. Build context from on-device state (today's timetable, open deadlines, recent captures).
3. Ask the LLM to choose a tool + arguments (structured JSON output; parse defensively).
4. Run the tool locally.
5. Return a short, glanceable result; speak it if voice mode is on.
6. If the tool is a "write/act" tool, route through the autonomy gate (§7) first.

Tools are plain functions with a typed schema. The LLM only ever selects among registered
tools — it never executes arbitrary code.

**MVP tool set:** `getNextClass`, `listDeadlines`, `addDeadline`, `captureNote`,
`summariseText`, `searchNotes`, `classifyNotification`, `buildDailyBriefing`.

---

## 6. LLM layer

- **One interface, many providers.** Define `LLMProvider` with a single `complete()` method.
  Implement NVIDIA NIM, Groq, and Gemini behind it.
- All three expose OpenAI-compatible chat endpoints → the client differs only by
  `baseURL` + `apiKey` + `model`. Keep those in config.
- **Failover chain:** NIM → Groq → Gemini. On rate-limit / error / timeout, fall through to
  the next. Surface a single clean error only if all fail.
- **Roles:** NIM = default reasoning; Groq = latency-sensitive (voice replies); Gemini
  Flash = long-context (PDF/notes summarising).
- Structured outputs: instruct the model to return **JSON only, no prose, no markdown
  fences**, then parse with a try/catch and a repair retry.
- Log token/latency per call locally (for tuning) — never log user content off-device.

---

## 7. Graduated autonomy (trust model)

Every agent capability has an autonomy level. The user unlocks higher levels per capability
as trust builds. **Default = Suggest.**

| Level | Behaviour | MVP default |
|---|---|---|
| **Suggest** | Agent proposes; user must tap to act | All "act" features start here |
| **Confirm** | Agent prepares the action; one-tap approve/reject | Opt-in |
| **Auto** | Agent acts, then notifies | Not in MVP |

MVP features are mostly read/summarise/remind (low-risk). Anything that would send, post,
or modify external data is **out of MVP scope** and, when it arrives, starts at Suggest.

---

## 8. Data & privacy (DPDP-aware)

The MVP is subject to India's **DPDP Act 2023 + DPDP Rules 2025**. Build for it now:

- **On first launch, show a clear consent notice** (plain language) stating exactly what
  Recall reads (notifications, calendar, mic when invoked) and that **text may be sent to
  third-party LLM providers** (NVIDIA/Groq/Google) for processing. No processing before consent.
- **Data stays local.** SQLite + MMKV on-device. No analytics SDK that exfiltrates content.
- **Minimise egress.** Send only the specific text a task needs to the LLM — never dump the
  whole DB or full notification history.
- **User rights, wired in:** in-app **export all data** and **delete all data**; withdraw
  consent = stop processing + purge.
- **Permissions are least-privilege** and requested in-context (explain *why* right before asking).

---

## 9. What NOT to do

- ❌ Add a backend / cloud DB / auth server "to be safe." The MVP is on-device by design.
- ❌ Commit real API keys, or ship a key with an unrestricted quota.
- ❌ Let the agent send/post/delete anything without explicit confirmation.
- ❌ Send full user data to an LLM when a snippet suffices.
- ❌ Pull in LangChain, a vector DB service, or heavyweight orchestration for the MVP.
- ❌ Build wrist/Wear OS code in this repo yet. (Voice-first discipline prepares for it; the
  port is a later phase.)
- ❌ Add health/fitness tracking, payments, or smart-home features (explicitly out of scope).

---

## 10. Success instrumentation

The MVP exists to test **retention**, so measurement is a first-class feature:

- Track **daily-active return** and **week-4 retention** locally (privacy-safe, aggregate).
- Track which feature drove each open (briefing? capture? deadline nudge?).
- Make the **daily briefing** the anchor habit — it must deliver fresh, useful output every
  morning, or retention dies (category abandonment ~30%; first 2–4 weeks decide it).

**Go/no-go the whole project hangs on:** >60% week-4 retention + a credible free→paid signal,
*before* any hardware spend.

---

## 11. Commands

```bash
# install
npm install

# run (dev)
npx expo start

# android
npx expo run:android

# typecheck / lint before every PR
npm run typecheck && npm run lint
```

Keep PRs small and single-purpose. Every PR: what changed, why, and which golden rule(s) it
touches.
