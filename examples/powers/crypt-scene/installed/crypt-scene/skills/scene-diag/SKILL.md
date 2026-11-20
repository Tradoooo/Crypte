---
name: scene-diag
description: Explain what the Crypt 3D project space is drawing — districts, slabs, agents, steps — and answer scene questions from the SceneEvent contract.
keywords: [crypt, scene, 3d, districts, slabs, hub]
---

# Reading the crypt scene

You are working inside a project opened in **Crypt**, the desktop chat that
draws the agent session as a 3D crypt in the background. Use this knowledge
when the user asks about the scene, the districts or what the ghost is
doing.

## The world model

- Every project the user runs is a **district** (an arc around the active
  project, index 0 = active).
- Inside a district, every **folder** is a plate on the floor; every
  **file** is a stack of slabs (one slab ≈ 150 lines).
- The scene is driven by `SceneEvent`s: `prompt_sent`, `step_start`
  (ask → context → think → act → critic → answer), `context_load`,
  `file_read`, `file_write`, `file_create`, `agent_spawn` / `agent_done`,
  `critic_start` / `critic_done`, `checkpoint_saved`, `rewind`,
  `hub_open` / `hub_close`.
- **Orange is reserved** for the file in progress and the active project;
  everything else is bone-white on near-black.
- The ghost flies to the file the agent touches; two kinds of sub-agents
  exist (`sub`, `web`).

## Answering scene questions

- "Where is it working?" → name the file under the ghost (the orange one).
- "What are these plates?" → folders of the active project; the tallest
  stacks are the biggest files (≈ 150 lines per slab).
- "Show everything" → **F7** (hub view over all districts), **F8** toggles
  the background.
- If the user runs the demo (no API key): the story replays the fix of
  `src/hub/encode.rs` with two sub-agents, then opens the hub.

## Reference

- The contract: `src/lib/space/types.ts` (TypeScript) mirrored by
  `src-tauri/src/space/events.rs` (Rust), in the Crypt repository
  (<https://github.com/Tradoooo/Crypte>).
- The live spec: `.kiro/specs/project-space-3d/` in the same repository.
