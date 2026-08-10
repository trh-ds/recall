# PRD — Recall (v0.1, MVP)

> Working name: **Recall** (placeholder, not final).
> Status: MVP / pre-build. Owner: Tirth.
> Companion docs: `AGENT.md` (build context) · *Agentic AI Wrist Assistant — India Market Assessment* (research) · *Wrist-Assistant MVP Brief* (feature brief).

---

## 1. Vision

An **agentic AI personal assistant** that lives on your wrist and *acts* for you — triaging
the noise, remembering what matters, and moving your day forward without you pulling out a
phone. Not another notification mirror; not another chatbot. The assistant you *wear*.

**Positioning:** competes on **capability**, not luxury or price. An Apple Watch *notifies*;
you still do the work. Recall *does the work*. (See §9 for the incumbent moat.)

---

## 2. Problem

Busy people lose hours to context-switching and notification overload. Evidence (global
proxies; India-specific quantification is a known gap to close with our own testers):

- Knowledge workers toggle between apps **~1,200×/day**, ~4 hrs/week just reorienting —
  ~9% of work time (HBR, 2022).
- ~**23 minutes** to refocus after a significant interruption (UC Irvine / Gloria Mark).
- Existing wearables and assistants are **passive** — they alert, they don't act.

The gap: **no shipping consumer product does proactive, agentic action from the wrist.**
That white space is real but time-limited (see §9).

---

## 3. Target users

| Segment | Role | Pain | Willingness to pay | Use in strategy |
|---|---|---|---|---|
| **Primary ICP** | Metro professionals, founders, sales (25–45), ₹15–50L/yr | High (email/calendar/meeting overload) | High (proven premium-wearable spend) | Monetisation target |
| **MVP testers** | High-performing students (e.g. B.Tech + MBA) | High (deadlines, notification chaos) | Low | **First free cohort — retention proof** |
| **Secondary** | Remote workers / freelancers | Med-High | Medium | Later expansion |

The **MVP ships to students first** to validate the daily habit loop cheaply. The **revenue
ICP is metro professionals** — the product must be designed so the same core generalises up
to them.

---

## 4. Goals & success metrics

**The single metric that gates the whole project:**
> **>60% week-4 retention** of the student cohort **+ a credible free→paid conversion signal**,
> achieved **before** any hardware investment.

Supporting metrics:
- Daily-active return rate (does the briefing earn a daily open?).
- Feature-level engagement (which feature drives opens).
- Task-capture → completion rate.
- Qualitative: "would you be disappointed if this disappeared?" (target >40% "very").

If engagement decays like a typical fitness tracker (~30% abandon within months), that is a
**NO-GO** signal for hardware — fix the loop first.

---

## 5. Scope

### In scope (MVP — Android app, on-device, no backend)
Voice-first Android app that runs entirely on-device, calling free LLM APIs directly.

### Out of scope (MVP)
- Custom hardware / wristband / Wear OS app (later phase).
- Cloud backend, hosted DB, user accounts/auth.
- Autonomous sending/posting (email send, message send) — later, and gated by autonomy model.
- Health/fitness tracking, payments, smart-home, IoT.
- iOS (Android-first; testers are on Android).

---

## 6. MVP features (student cohort)

Priority: **P0** = must ship, **P1** = strongly wanted, **P2** = nice-to-have.

| # | Feature | Priority | What it does | Habit role |
|---|---|---|---|---|
| F1 | **Daily briefing** | **P0** | Morning summary: today's classes, deadlines, top 3 tasks; evening wrap of what slipped | **Anchor habit** |
| F2 | **Deadline & assignment tracker** | **P0** | Proactive countdown reminders ("DBMS assignment due in 6h, not started") | Retention driver |
| F3 | **Voice quick-capture** | **P0** | Speak a thought mid-lecture → transcribed, auto-tagged (assignment/idea/todo), recalled later | Core "agentic" feel |
| F4 | **Notification triage** | **P1** | Filters noisy college/club groups from what matters (faculty, placement cell, teammates) | Solves the stated pain |
| F5 | **Timetable "what's next"** | **P1** | Knows the schedule; surfaces next class/room/prep at a glance | Daily utility |
| F6 | **Ask-my-notes + PDF summariser** | **P1** | Summarise a long PDF shared on WhatsApp; Q&A across saved notes before exams | Exam-time stickiness |
| F7 | **Exam-prep countdown** | **P2** | Spaced study nudges built from the timetable | Seasonal driver |

**Memory (v1):** store captures/notes in SQLite; retrieve by **keyword + recency** — good
enough to feel smart. Add embeddings (NVIDIA NIM embedding models) only after the loop is validated.

---

## 7. Full-product feature set (roadmap vision — NOT MVP)

The mature product's eight capabilities, for direction only:

1. Agentic email management (triage, draft, send-on-approval)
2. Calendar intelligence (optimal slots, conflict resolution, prep context)
3. Task orchestration (priority by deadline/urgency)
4. Voice-first capture & control
5. Integration layer (Gmail, Calendar, Slack, WhatsApp, CRM)
6. Contextual notification filtering
7. Meeting booking automation
8. Real-time summarisation & role-aware briefings

Heavy reasoning for these runs on **cloud LLMs** — on-device open-weight models can't reason
reliably enough for professionals, and an agent that errs *costs* them time. The wrist stays
a thin interface (display, mic, haptics, confirmations).

---

## 8. UX principles

- **Daily value or death.** The briefing must be fresh and useful every day — it is the habit.
- **Glanceable.** Every output readable in ~2 seconds; designed as if already on a wrist.
- **Voice-first.** Hands-free capture and readout; typing is the fallback, not the default.
- **Graduated autonomy.** Suggest → Confirm → Auto, unlocked per capability. Default Suggest.
  Nothing irreversible without explicit approval. (Trust is the adoption bottleneck.)
- **Transparent by design.** The user always knows what was read and what was sent to an LLM.

---

## 9. Competitive & moat

- **White space:** agentic *action* on the wrist is unoccupied today (Apple Watch, Galaxy
  Watch, Whoop, Ultrahuman = passive; Bee/Limitless = passive capture; Humane/Rabbit = failed).
- **Threat is near:** Gemini on Wear OS (2025); agentic Siri, Gemini-powered, slated 2026.
  A wrist-only feature is "Sherlockable" (cf. Pebble after Apple Watch).
- **Defensible moat is NOT the form factor.** It is: **cross-platform workflow depth**
  (Gmail + Calendar + tasks acting together across Google/Microsoft/Apple), **trust/privacy
  positioning**, and **speed to a daily habit** before incumbents generalise. Vertical depth
  (sales / founders / consultants) is the wedge incumbents won't prioritise.

---

## 10. Technical requirements

- **Platform:** React Native (Expo), TypeScript, Android-first.
- **On-device only:** no server; SQLite + MMKV storage; agent loop in TS.
- **LLM providers (free tiers):** NVIDIA NIM (primary), Groq (speed), Gemini Flash (long
  context) — OpenAI-compatible, behind one abstraction with **failover**.
- **Security:** restricted/low-quota keys only in client builds; move keys behind a thin
  proxy **before any public release** (keys in an APK are extractable).
- Full engineering detail: see `AGENT.md`.

---

## 11. Privacy & compliance (DPDP Act 2023 + DPDP Rules 2025)

- Consent notice on first launch (plain language; itemises data read + third-party LLM egress).
- Data stays on-device; minimise what's sent to LLMs.
- In-app **export** and **delete all data**; consent withdrawal purges data.
- Least-privilege, in-context permission requests.
- Below the "Significant Data Fiduciary" threshold, no mandatory DPO/DPIA — but privacy-by-design
  is core to the trust proposition regardless.

---

## 12. Monetisation (post-validation)

- **Hybrid** (thin hardware + subscription) — the only India-proven premium-wearable model
  (cf. Whoop, Ultrahuman). Hardware-only is unsound given recurring cloud-LLM cost.
- **Price anchors are low in India:** ChatGPT Go ₹399/mo, Google AI Plus ₹199–399/mo.
  Likely sub band **₹399–999/mo**, sold on *time saved*, not AI novelty.
- MVP is **free** to testers; monetisation is validated only after the retention gate.

---

## 13. Roadmap

1. **MVP** — React Native student app (§6), on-device, restricted keys. → prove retention.
2. Collect genuine reviews; iterate the habit loop.
3. Add thin proxy + move reasoning to stronger cloud models; expand to professional ICP features.
4. **Wear OS companion** on existing hardware (Galaxy Watch / Wear OS) — no custom silicon.
5. Only then: explore custom hardware / desk-robot form factor.

---

## 14. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Wearable/app abandonment (~30%; first 2–4 weeks decisive) | Anchor on a daily briefing that delivers fresh value every morning |
| Incumbents ship agentic AI (Gemini/Siri 2026) | Win on cross-platform depth, trust, and speed to habit; go vertical |
| Low India AI-subscription ARPU | Hybrid monetisation; sell outcomes; validate WTP with primary research |
| Trust in autonomous action | Graduated autonomy, default Suggest, explicit confirmation |
| Client-side API keys extractable | Restricted/low-quota keys now; proxy before public launch |
| India pain-point data is a global proxy | Instrument the student cohort to gather first-party evidence |

---

## 15. Open questions (validate before hardware)

1. Does the app hit **>60% week-4 retention** with a real free→paid signal? (Primary gate.)
2. Will the professional ICP pay **₹15–25k hardware + monthly sub** at these economics?
   (Needs conjoint/WTP research — note Ultrahuman earns only ~2.7% of revenue in India.)
3. Is there a concrete moat that survives **Gemini Intelligence + agentic Siri** reaching
   phones and watches by late 2026?
