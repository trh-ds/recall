---
name: android-agentic-ai
description: Use when building agentic AI features into an Android app (on-device or cloud-backed LLM agents, tool-calling, RAG, background agent workflows) or when doing general modern Android development (Kotlin, Jetpack Compose, Gradle, architecture). Trigger on tasks involving LLM integration in Android, Compose UI, Navigation, Gradle/R8 config, or migrating legacy XML views to Compose.
---

# Android + Agentic AI Development

## Modern Android Foundations

- Default to **Kotlin** and **Jetpack Compose** for all new UI; don't introduce new XML layouts.
- Use **Navigation 3** (or Navigation Compose) for screen navigation; avoid Fragment-based navigation in new code.
- Keep Gradle on **Android Gradle Plugin (AGP) 9+**; check `gradle.properties` / version catalogs before assuming an older AGP baseline.
- Configure **R8** (not just ProGuard) for release builds; verify keep rules don't over-broadly disable shrinking.
- Follow **edge-to-edge** display best practices (no manual status/nav bar color hacks — use `enableEdgeToEdge()` and `WindowInsets` handling).
- Prefer sealed interfaces/classes and Kotlin's type system for state modeling (e.g., UI state as a sealed `Result`/`UiState` hierarchy) — this gives dense, structured signal that's easy to reason about and to generate code against.

## Migrating Legacy Code

- When migrating XML → Compose, migrate screen-by-screen behind `AndroidView`/`ComposeView` interop rather than a big-bang rewrite.
- For multi-module or Kotlin Multiplatform (KMP) projects, use `expect`/`actual` to keep iOS/Android implementations in sync when extracting shared business logic.

## Agentic AI Integration Patterns

- **On-device vs. cloud**: Decide early whether inference runs on-device (e.g., Gemini Nano via ML Kit GenAI APIs / AICore, or a local GGUF model via MediaPipe LLM Inference API) or cloud-backed (calling out to an LLM API). On-device favors privacy/latency/offline use; cloud favors larger models and easier iteration.
- **Tool-calling / function calling**: Define a clear, typed contract (Kotlin data classes + `kotlinx.serialization`) between the agent and app-side "tools" (e.g., reading calendar, sending a message, querying local DB). Validate and sandbox any tool the agent can invoke — treat model output as untrusted input.
- **Background agent workflows**: Use `WorkManager` for durable, retryable background agent tasks (not raw coroutines/Services) so agent work survives process death and respects battery/Doze constraints.
- **Streaming responses**: Use Kotlin `Flow` to stream token-by-token LLM output into Compose UI (`collectAsState`/`collectAsStateWithLifecycle`) for responsive agent chat UIs.
- **RAG on-device**: For local retrieval-augmented generation, pair an on-device vector store (e.g., ObjectBox, SQLite + a vector extension, or Room with a custom index) with the on-device embedding model; keep embedding + retrieval off the main thread.
- **Runtime/production signal**: The highest-value agentic work connects the coding agent not just to source code but to runtime state — logs, crash reports (Play Console / Firebase Crashlytics), and real device telemetry — so the agent can debug against what's actually happening in production, not just static code.

## Testing & Safety for Agent Features

- Write deterministic tests around the tool-calling boundary (mock the LLM, assert the app correctly parses/executes tool calls) separately from any tests that hit a real model.
- Rate-limit and log every agent-initiated action that has a side effect (sending data, making a purchase, modifying files) and consider a user-confirmation step for irreversible actions.
- Version and pin prompt templates the same way you'd version an API — treat prompt changes as code changes requiring review.
