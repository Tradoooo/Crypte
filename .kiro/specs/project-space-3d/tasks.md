# Project space 3D — tasks

Every task below is **done and merged**: this spec is the live example of
the Kiro workflow in this repository.

- [x] 1. Define the `SceneEvent` contract shared by Rust and TypeScript.
  Detail: 16 variants, snake_case with a `type` tag, contract test
  (`remaining_variants_match_types_ts`).
  → **#147** (`feat/space-tauri`), merged into main by **#154**.

- [x] 2. Derive the scene events from the domain events on the Rust side.
  Detail: `space/events.rs::derive`, one channel (`space-event`), never
  breaking the chat when the log is disabled.
  → **#147**, merged into main by **#154**.

- [x] 3. Fold the events into the scene state on the frontend.
  Detail: `apply(state, event, now)` is the only writer; the state lives
  in `src/lib/space/state.ts` (`state.test.ts`).
  → **#147**, merged into main by **#154**.

- [x] 4. Lay out the crypt: folders as plates, files as slabs.
  Detail: `layout.ts` pure and tested; one slab ≈ 150 lines; the districts
  never overlap.
  → **#147**, merged into main by **#154**.

- [x] 5. Render the scene with three.js behind the chat panel.
  Detail: transparent canvas + CSS background (no double sRGB), lights ×π,
  tight bloom, constant-size labels.
  → **#147**, merged into main by **#154**.

- [x] 6. Toggle the background with F8, keep the chat readable.
  Detail: the panel is glass, the crypt is visible through and around it;
  F8 alone switches the background off.
  → **#147**, merged into main by **#154**.

- [x] 7. Make F7 show **every** project, not only the active one.
  Detail: `space_districts` returns the workspaces (`KH_SPACE_WORKSPACES`,
  `~/code`), the hub distance follows the real footprint, the arc is
  bounded so the districts stay in frame.
  → **#160**.

- [x] 8. Add the chat tabs to the panel (one tab per chat, state dot,
  `+N`, `+`).
  Detail: `tabs.ts` pure, `SpaceTermHead.svelte`, middle-click closes.
  → **#165**.

- [x] 9. Fix the tab bar per DESIGN §11.1 V2.1 (the film defect).
  Detail: label = chat name (12 chars), tabs shrink, the `+` and ⌘K are
  never cut, `+N` computed from the real width (`ResizeObserver`); vitest
  case: 6 chats in a 360 px panel.
  → **#170**.

- [x] 10. Property-based tests on the layout and the tabs.
  Detail: fast-check on `fitTabs` (the active tab is always visible, shown
  + hidden = total, what is shown always fits) and on the layout (two
  districts never overlap, every file has a position); proptest on the
  Rust side (the scan invariants: every file attached to a valid folder,
  unique paths, deterministic order).
  → **#174**.

- [x] 11. Document the feature: the steering `project-space.md`, the
  design reference and the README.
  Detail: the steering describes the contract, the palette, the layout
  rules and the tabs; the README shows the journey (open a project, press
  F7).
  → **#173** (steering) and **#178** (README).
