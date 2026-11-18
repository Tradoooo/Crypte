# How we used Kiro

Crypt is a chat for coding agents **that runs `.kiro/` itself**: the product
reads the same steering, specs, hooks, agents, skills and powers as the Kiro
IDE. This page is the factual inventory of how Kiro artefacts were used to
build it — every block lists the files, what it prevented or accelerated,
and one concrete example you can check in the history.

The `.kiro/` directory of this repository holds **23 files**: 9 steering
documents, 5 hooks, 3 workflows, 3 custom agents, 2 skills, 2 specs (one
live, one retired), 1 MCP config.

## IDE and CLI

The repository was driven from the Kiro-compatible agent harness of Crypt
itself (the terminal build, branch `feat/project-space-3d`) and from Kiro
IDE sessions on the desktop app. The Kiro artefacts below are the contract
between the humans, the agents and the IDE: one format, three runtimes.

- **Files**: the whole `.kiro/` tree; the compatibility engine lives in
  `src-tauri/src/kiro/` (`steering.rs`, `spec*.rs`, `hook*.rs`, `mcp*.rs`,
  `skills.rs`, `powers.rs`).
- **What it prevented**: two teams of agents (terminal and desktop) drifting
  apart — both read the same steering, so the conventions (palette, file
  budget, English UI) were enforced in every session on both sides.
- **Concrete example**: the Tauri port (PR #144) kept the TUI's conventions
  untouched because the steering already described them; the reviewer agent
  was the same on both branches.

## Steering (`.kiro/steering/`, 9 files)

`product.md`, `structure.md`, `tech.md`, `security.md` (always) +
`haunt-game.md`, `kiro-compat.md`, `pixel-art.md`, `project-space.md`
(fileMatch) + `ghostty-launcher.md` (manual).

- **What it accelerated**: onboarding to zero — a fresh agent session opens
  the right steering for the file it touches (`project-space.md` fires only
  on `src/lib/space/**`).
- **What it prevented**: convention drift. The palette rule (no colour
  outside `theme.rs` / the `--cry-*` variables) is stated once and repeated
  by hooks; the file budget (500 lines / 30 functions) blocked several
  over-grown files before review.
- **Concrete example**: #173 realigned every steering file on the Tauri v2 +
  Svelte 5 reality (the paths of the terminal era were still pointing at
  `src/haunt/**`, which no longer exists).

## Hooks (`.kiro/hooks/`, 5 files)

| file | trigger | what it runs |
| --- | --- | --- |
| `rust-save.json` | PostFileSave `.rs` | `cargo fmt --check` + the 500/30 file budget on `src-tauri/src` |
| `rust-guards.json` | PostFileSave `.rs`/`.svelte`/`.css`/`.ts` | palette guard: no hardcoded RGB outside `theme.rs`, no hex outside the palette files |
| `rust-task.json` | PostTaskExecution | `cargo clippy --all-targets -- -D warnings` + `cargo test --manifest-path src-tauri/Cargo.toml` |
| `front-save.json` | PostFileSave `.svelte`/`.ts` | `npm run check` (svelte-check) |
| `front-task.json` | PostTaskExecution | `npm test` (vitest) |

- **What it prevented**: any save that breaks the format, the budget, the
  palette or the types stops the agent immediately instead of at review
  time.
- **Concrete example**: the full hook output pasted in PR #173 — run from
  the repository root after the realignment, every hook exit 0: fmt clean,
  file budget clean, palette clean, svelte-check `0 errors and 0 warnings`,
  `npm test` green, `cargo test` green. A hook firing red is the expected
  case too: on Windows, before #171, `cargo test` did not even compile —
  the hook made the breakage impossible to miss.
- **Real output** (same run): `test result: ok. 456 passed; 0 failed`
  (Windows) and `469 passed` on the Linux CI with the Unix-only tests.

## Custom agents (`.kiro/agents/`, 3)

`crypte-relecteur.md` (read-only reviewer), `crypte-fx-gardien.md` (colours
and effects guardian), `crypte-pixel-artiste.md` (sprite artist).

- **What it prevented**: review theatre. The reviewer is read-only by
  permission (`fs_write: deny`) and must paste the commands it ran and the
  observed results — no verdict without evidence.
- **Concrete example**: the reviewer's rule 2 (zero warning, `clippy -D
  warnings`) is exactly what #171 fixed: on Windows the suite carried two
  warnings (`Duration`/`Instant` imports, a dead constant) that the grid
  had to refuse — the same grid runs on the Linux CI, which was green.

## Skills (`.kiro/skills/`, 2)

`crypte-verif` (verify without network or key: smoke, fmt, clippy, tests,
frontend, build + the release process) and `pixel-art` (draw a creature:
32×32 letter grids, palette letters, integer scaling, sheet regeneration).

- **What it accelerated**: verification is one recall away instead of a
  checklist to retype; the commands are the real ones, with
  `--manifest-path src-tauri/Cargo.toml` since the Tauri port.
- **Concrete example**: every sprite retouch ends with the sheet
  regeneration command (`--sheet docs/bestiaire.png`) — the skill documents
  it, the artist agent runs it.

## Workflows (`.kiro/workflows/`, 3)

`crypte-verif` (build → test → review, three chained agents),
`crypte-pr` (open the PR, then watch and answer reviews/checks until
green), `crypte-sprite` (plan → draw → verify a sprite).

- **What it accelerated**: PR discipline. `crypte-pr` encodes the repository
  rules (squash, update by merge, never rebase, the `hold` escape label).
- **Concrete example**: the release PRs (#162, #169) went through the
  verify-then-PR loop; the CI green + merge queue discipline is what the
  workflow automates.

## Specs (`.kiro/specs/`, 2)

- **`project-space-3d/`** — the live spec of the flagship feature: 20
  requirements in **EARS**, a design that mirrors the implementation
  (contract, layout, camera, palette, tabs), and 11 tasks **all checked**,
  each pointing at its merged PR (#147, #154, #160, #165, #170, #174).
- **`portefeuille-persistant/`** — retired on 2026-11-14 (the shop was
  removed, #155). Kept as a trace of the workflow, banner in every file.

- **What it prevented**: spec drift. The requirements of the 3D space
  (F7 shows every project, the active tab always visible, offline demo)
  live in the spec; each fix closes a requirement, not a mood.
- **Concrete example**: requirement R9 ("when the projects exceed the
  frame, the camera scales with the real footprint") is what #160
  implemented — the task list of the spec points straight at the PR.

## MCP (`.kiro/settings/mcp.json`)

The app speaks the MCP protocol (tools only, stdio/HTTP) for the servers
declared in a project or a power: `mcp_<server>_<tool>`, `autoApprove`
without confirmation, `/mcp` status.

- **What it accelerated**: agent tooling without bespoke code — any MCP
  server (grep, fetch, database) plugs into a chat.
- **What it prevented**: another config format; Kiro projects move between
  the IDE and Crypt without translation.
- **Concrete example**: the engine is covered end to end —
  `kiro/mcp_pool/tests.rs` drives a scripted MCP server over stdio (lists,
  `read`, prompts) and the connection states it must report.

## Powers (`.kiro/powers/` + `powers.rs`)

Crypt reads Kiro **powers** (Agent Plugins: `plugin.json`, `POWER.md`,
embedded `skills/`, `mcp.json` with a per-power `cwd`). An example power is
versioned in this repository: `examples/powers/crypt-scene/` (PR #179) —
install it in `~/.kiro/powers/` to give any Kiro agent the crypt's scene
diagnostics (the README explains the install).

- **What it prevented**: "Crypt runs your `.kiro`" staying a claim instead
  of a demo: the example power is the proof, and its install path is
  documented step by step in the README.
- **Concrete example**: the `cwd` field of a power's `mcp.json` is
  relativised to the power folder and absolutised at load — covered by
  `kiro/powers.rs::tests::load_moderne_legacy_et_vide` (and normalized for
  Windows separators in #171).

## Property-based testing (in the hooks and the CI)

- **Rust** (`proptest`, `space/scan_props.rs`): the scanner never produces
  a broken tree — every file attached to an existing folder, unique
  relative paths, valid parents, deterministic scans (24 generated trees).
- **TypeScript** (`fast-check`): the 3D layout never overlaps two districts
  and always gives every file a position; the chat tabs always keep the
  active tab visible, shown + hidden = total, and never overflow the panel.
- Wired into `rust-task.json` and `front-task.json` (PostTaskExecution), so
  a Kiro session cannot finish with a broken invariant; the CI runs the same
  suites on every PR (merged in #174).

## The numbers (main, at the time of writing)

- **469 Rust tests + 47 vitest tests green on main** (CI, ubuntu-latest).
- **23 files in `.kiro/`**.
- The demo video says "448 tests": that is the **terminal build**
  (`feat/project-space-3d`, the TUI). The desktop app counts 469 + 47 —
  TUI + desktop, same suites, two products.

## Credits

Kiro (https://kiro.dev) — the spec/steering/hook formats this repository
and the product both speak. Crypt is an independent implementation of the
same workspace conventions, written for the Kiroween hackathon.
