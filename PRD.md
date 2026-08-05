# PRD — Offline AI Personal Assistant for Android (MVP)

**Working title:** Pocket (placeholder — rename later)
**Owner:** Tirth
**Status:** Draft v1 — MVP scoping

---

## 1. Vision

An on-device AI layer for Android that remembers what the user tells it, resurfaces it at the right moment (voice or idle time), and answers questions by searching its own memory — not another chatbot, a private second brain that works offline.

## 2. Problem Statement

Users forget small but important things (who owes them money, a deadline mentioned in passing, a file someone sent) because capturing and retrieving that info today means manually opening the right app and searching. No offline-first, privacy-preserving tool exists that treats "remembering" as a first-class product feature.

## 3. Target User

Power users / students / early professionals who juggle many small commitments (money, tasks, files, conversations) across apps and want a private, always-available memory layer — not a general-purpose chatbot.

## 4. MVP Scope — Core Features

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Capture memory** | User tells the assistant something (voice or text) → parsed into a structured memory (fact, task, reminder, debt, note) + stored with embedding. |
| 2 | **Recall / Q&A** | User asks a natural-language question → query embedded → vector search over local memory store → LLM composes an answer from retrieved memories. |
| 3 | **Smart reminders** | Time-based ("remind me tomorrow at 6") and context-based (idle-time / "free moment") nudges surface pending items without needing exact timing. |
| 4 | **On-device LLM inference** | Small quantized model handles parsing, retrieval-augmented answering, and reminder phrasing — runs locally, invoked only on demand (event-driven, not always-on). |
| 5 | **Local vector store** | All embeddings/memories persisted on-device; nothing leaves the phone by default. |
| 6 | **Minimal UI** | Chat-style input for capture/query + a simple feed/list of active reminders and open items. |

## 5. Explicitly Out of Scope for MVP (Phase 2+)

- Notification / email indexing and summarization
- WhatsApp, file, contacts, calendar indexing ("find the PDF Rahul sent")
- Automated morning briefing
- Cloud LLM fallback for deep reasoning
- GUI automation / cross-app actions

MVP proves the core loop: **capture → store → recall → remind.** Everything else is an indexing/integration layer bolted on afterward.

## 6. Core User Flows

**A. Capture**
1. User says/types: "Rahul owes me ₹2000 for the trip."
2. Assistant classifies intent (fact vs. task vs. reminder), extracts entities, stores as a memory record + embedding.
3. Confirms briefly: "Noted."

**B. Recall**
1. User asks: "Who owes me money?"
2. Query embedded → top-k similar memories retrieved from vector store.
3. LLM synthesizes a direct answer from retrieved records, not from general knowledge.

**C. Reminder**
1. User says: "Remind me to submit the OS assignment before Friday."
2. Stored as a task with a due window.
3. Assistant surfaces it either at the explicit time, or opportunistically when it detects the user is idle/free (e.g., screen unlocked with no active app engagement for N minutes), whichever the design settles on for detecting "free time" on Android.

## 7. High-Level Architecture

```
[Voice/Text Input]
       │
       ▼
[Wake/Trigger Layer] — event-driven: voice command, explicit open, or scheduled check
       │
       ▼
[Intent Parser] (on-device LLM, small quantized model)
       │
       ├──► [Memory Writer] → structured record + embedding → [Local Vector DB]
       │
       └──► [Query Engine] → embed query → similarity search → [Local Vector DB]
                                     │
                                     ▼
                          [LLM Answer Composer] → response to user
       │
       ▼
[Reminder Scheduler] — Android WorkManager / AlarmManager
   (time-based + idle-detection triggers)
```

## 8. Data Model (memory record — draft)

```json
{
  "id": "uuid",
  "type": "fact | task | reminder | debt | note",
  "raw_text": "string",
  "extracted": { "entity": "Rahul", "amount": 2000, "due": "2026-08-10" },
  "embedding": "float[]",
  "created_at": "timestamp",
  "status": "open | done | dismissed",
  "surface_after": "timestamp | idle_trigger | null"
}
```

## 9. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| App shell | **React Native** (New Architecture) + TypeScript | Your call — fast iteration, one codebase |
| On-device LLM | **llama.rn** (RN binding for llama.cpp, GGUF models) | Runs quantized small models (Phi/Qwen/Gemma-class, ~1–3B) locally |
| Embeddings | Same llama.cpp runtime, small embedding model (e.g. quantized MiniLM/gte-small GGUF) | Keeps inference + embedding on one runtime, less native surface |
| Vector store | **ObjectBox** (has RN binding + built-in HNSW vector search) | Avoids hand-rolling vector search in SQLite; fallback: `op-sqlite` + `sqlite-vec` extension |
| Fast local KV | **MMKV** (`react-native-mmkv`) | App state, settings, session cache |
| Speech-to-text | `@react-native-voice/voice` (native OS speech recognizer, on-device where supported) | `whisper.rn` as a heavier fallback if accuracy demands it |
| Local notifications | **Notifee** | Reliable scheduled + triggered reminders on RN |
| Background/idle scheduling | Thin native module wrapping `WorkManager`/`AlarmManager` (Android side) + `react-native-background-fetch` | RN has no direct equivalent — this needs native code either way |
| Idle/free-time detection | Native module: screen-state + foreground-app/usage-stats signals | No clean cross-platform API; Android-only native bridge required |

## 10. Non-Functional Requirements

- **Offline-first:** core loop (capture/recall/remind) must work with zero network.
- **Privacy:** no memory content leaves the device without explicit user action.
- **Battery:** model loads only on trigger, unloads after use; no persistent background inference.
- **Latency:** capture and recall should feel near-instant (<2–3s) on a ~16GB RAM device.

## 11. Success Metrics (MVP)

- Daily active capture events per user
- % of reminders acted on vs. dismissed
- Recall query success rate (user doesn't have to rephrase)
- Retention after 2 weeks

## 12. Open Questions / Risks

- Which on-device model size gives acceptable quality vs. RAM/battery budget?
- Reliable, non-invasive "user is idle/free" signal on Android without excessive permissions.
- On-device STT accuracy for casual speech vs. cloud STT quality.
- How much structuring (intent classification) can run reliably on a small local model vs. needing a bigger model.

## 13. Roadmap

- **Phase 1 (MVP):** Capture, recall, reminders, local vector store, minimal UI.
- **Phase 2:** Notification + WhatsApp/file/contacts/calendar indexing, morning briefing.
- **Phase 3:** Optional cloud LLM hybrid for deep reasoning on explicit request.

---

Ready for feature-by-feature go/no-go review.