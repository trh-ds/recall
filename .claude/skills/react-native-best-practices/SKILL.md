---
name: react-native-best-practices
description: Use when writing, reviewing, or debugging React Native (including Expo) code. Covers performance (JS thread, Hermes, bundling), list virtualization, animations, navigation, state management, and native module patterns. Trigger on tasks involving frame drops, jank, slow lists, native modules, or general React Native architecture decisions.
---

# React Native Best Practices

## Performance

- **JS thread**: Keep the JS thread free of heavy synchronous work. Move expensive computation off-thread (e.g., `InteractionManager.runAfterInteractions`, worklets, or native modules) so gestures/animations don't stutter.
- **Hermes**: Assume Hermes is the JS engine. Prefer patterns that work well with Hermes bytecode precompilation; avoid dynamic `eval`-like patterns and huge single bundles.
- **Bundling**: Enable Hermes bytecode precompilation and RAM bundles/inline requires for large apps. Split code where possible; lazy-load rarely used screens.
- **Avoid unnecessary re-renders**: Use `React.memo`, `useMemo`, `useCallback` deliberately (not reflexively). Prefer state colocated close to where it's used over lifting state unnecessarily high.
- **Images**: Use properly sized images, `resizeMode` appropriately, and consider `expo-image` or `react-native-fast-image` for caching and performance over the built-in `Image`.

## Lists

- Use `FlashList` (Shopify) over `FlatList` for long or complex lists — it recycles views and is dramatically faster.
- Always provide stable `keyExtractor`, avoid inline function/object props in `renderItem` where possible, and set `estimatedItemSize` (FlashList) for smooth scrolling.
- Avoid nesting `FlatList`/`FlashList` inside `ScrollView` — this defeats virtualization.

## Animations

- Prefer `react-native-reanimated` (worklets run on the UI thread) over the legacy `Animated` API for anything gesture-driven or performance-sensitive.
- Pair with `react-native-gesture-handler` for native-driven gestures instead of the JS responder system.
- Avoid animating layout properties (width/height/flex) when possible — prefer transforms (`translateX/Y`, `scale`, `opacity`), which are cheaper and GPU-accelerated.

## Navigation

- React Navigation is the default choice unless the project already uses Expo Router (file-based routing on top of React Navigation) — prefer Expo Router for new Expo projects.
- Keep navigators shallow; avoid deeply nested navigator trees that complicate deep linking and state restoration.
- Use native stack (`@react-navigation/native-stack`) over the JS-based stack for native transition performance.

## State Management

- Default to React's built-in state (`useState`, `useReducer`, Context) for small-to-medium apps. Reach for Zustand, Jotai, or Redux Toolkit only when cross-cutting/global state complexity justifies it.
- Keep server state (API data) separate from UI state — use React Query / SWR for server state caching, invalidation, and refetching rather than hand-rolling it in global state.

## Native Modules & Platform Code

- Check for an existing well-maintained library before writing a custom native module.
- When writing native modules, follow the New Architecture (TurboModules/Fabric) patterns if the project has it enabled — check `newArchEnabled` in `gradle.properties` / Podfile before assuming the old bridge architecture.
- Isolate platform-specific code with `.ios.js`/`.android.js` file extensions or `Platform.select()` rather than scattering `Platform.OS` checks throughout components.

## Debugging Jank / Frame Drops

1. Profile with Flipper or the React Native DevTools performance monitor to see if the bottleneck is JS thread or UI/native thread.
2. Check for expensive re-renders with the React DevTools Profiler.
3. Check for large, unmemoized list renders or images loaded at full resolution.
4. Verify animations are running on the UI thread (Reanimated worklets), not bridged from JS on every frame.

## Monorepo / Project Structure

- For multi-package projects (shared UI, business logic across web/mobile), use a monorepo (Turborepo, Nx, or Yarn/PNPM workspaces) with a clear boundary between platform-agnostic and platform-specific code.
- Keep a single source of truth for design tokens/theme shared across platforms where feasible.
