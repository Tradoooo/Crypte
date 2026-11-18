# crypt-scene — an example Kiro power

A **Kiro power** (Agent Plugins 1.0.0) that teaches any Kiro agent to read
the 3D scene Crypt draws: districts, slabs, sub-agents, the six steps, the
orange rule. Crypt runs it exactly like Kiro does — Crypt reads
`~/.kiro/powers/` too (engine: `src-tauri/src/kiro/powers.rs`).

## Install

```sh
mkdir -p ~/.kiro/powers/installed
cp -r installed/crypt-scene ~/.kiro/powers/installed/
```

That is the whole install. Kiro (and Crypt) pick it up on the next
session; the power activates when a prompt contains one of the keywords
(`crypt`, `scene`, `3d`, `districts`, `slabs`, `hub`).

## Files

- `installed/crypt-scene/plugin.json` — the manifest (Agent Plugins 1.0.0:
  name, version, description, keywords, author).
- `installed/crypt-scene/skills/scene-diag/SKILL.md` — the skill body,
  injected when the power activates.

A power may also carry an `mcp.json` (per-power `cwd` supported); this
example is skill-only on purpose: no server, no network, nothing to trust.

## Verify

- In Kiro: open the Powers panel — `crypt-scene 1.0.0` is listed.
- In Crypt: `/powers` — same list, same activation keywords.
- Engine tests: `cargo test --manifest-path src-tauri/Cargo.toml powers`
  (`load_moderne_legacy_et_vide` proves the exact format this folder uses:
  `plugin.json` + `skills/<name>/SKILL.md`, `mcp.json` absent = no servers).
