# Crypte (Tauri + Svelte)

LLM chat in a haunted crypt, as a desktop app: creatures of pixel art
(the Haunt bestiary), the spirit hub, Kiro the mascot ghost, apparitions
that react to the chat, horror effects (vignette, fog, lightning), a
header **fear gauge** (`fear`, % of the model's context window), and a
**global** token counter. Port of the `kiro-horror-tui` terminal app to
**Tauri v2** (Rust backend) + **Svelte 5** (web frontend), same features,
same crypt palette.

Screens: Chat, Settings, Vps, Haunt, plus the inter-agent panel (bus +
mailbox) and the 3D project space (F7/F8).

## Two ways to try it

**Demo, no API key (offline).** Launch the app: with no provider
connected, the chat composer shows a **Try the demo** button. It replays
a full agent session — the crypt gets populated, sub-agents are spawned
and delivered, the review chat answers — with zero network and zero key.
Press **F7** at the end: every project you run is drawn in the 3D crypt
(the districts are your local folders, scanned offline). **exit demo**
returns to your real chats.

**With your own key.** Settings → connect a provider: any
OpenAI-compatible endpoint works (Anthropic, OpenAI, OpenRouter, Ollama,
LM Studio, vLLM…). Add the base URL, paste the key (masked, stored in an
encrypted vault, never logged) and pick a model. The demo exits by
itself the moment a provider connects.

## Install

Releases : <https://github.com/Tradoooo/Crypte/releases> (bundles Tauri
Windows `.msi`, macOS `.dmg`, Linux `.AppImage`, plus the terminal build
`kiro-horror-tui` for Linux/macOS).

```sh
# macOS : right-click the app > Open (unsigned build)
open crypte_1.0.0_universal.dmg
# Linux
chmod +x crypte_1.0.0_amd64.AppImage && ./crypte_1.0.0_amd64.AppImage
# Windows : installer .msi (SmartScreen : More info > Run anyway)
```

### Journey (the one from the video)

1. Clone your project from GitHub.
2. Launch Crypt **inside that folder** (the folder is the project drawn
   in the 3D crypt).
3. Press **F7** — the 3D crypt turns on and pulls back over **every
   project you run**. F8 toggles the background, **F5** is a scare, F9
   plays Haunt.

Without a release binary: `npm install && npm run tauri dev` in this
repository (needs Rust stable, Node 22+ and the Tauri system libs).

## Stack

- Backend: Rust 2021, Tauri v2 (`src-tauri/`, lib `crypte_lib` + `crypte` bin)
- Frontend: SvelteKit 2 in static SPA mode (`ssr=false`), Svelte 5 runes,
  Vite, TypeScript strict, Vitest
- Bridge: ~75 `#[tauri::command]`s + 2 event channels (`crypte-event`,
  `crypte-ui`) — contracts in `src/lib/contracts.ts`

## Develop

Prerequisites: Rust stable, Node 22+, Tauri v2 system libs
(`libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev
librsvg2-dev` on Debian).

```sh
npm install
npm run tauri dev   # desktop app with hot reload
npm run check       # svelte-check (types)
npm run test        # vitest
npm run build       # static frontend -> build/
cd src-tauri && cargo test   # backend tests (447)
```

Gates (must stay green): `cargo fmt --check`, `cargo clippy
--all-targets -- -D warnings`, `cargo test`, `npm run check`,
`npm test`, `npm run build`.

## Headless CLI

The binary embeds the TUI's headless surface (same names, same effects):

```sh
crypte --smoke            # self-check, no network, no key
crypte --sheet out.png    # creature sheet (34 drawings) as PNG
crypte --apercu out.json  # preview report as JSON
crypte --mbox <args...>   # broadcast CLI (same files as bcast shell)
crypte --events-log f     # append domain events as JSONL (KH_EVENTS_LOG)
```

## Data & migration

New paths under the Tauri app id (`com.crypte.app`):

- config: `$XDG_CONFIG_HOME/com.crypte.app` (`chats.json`, `permissions`,
  `permissions-rules`, `vps.toml`)
- data: `$XDG_DATA_HOME/com.crypte.app` (`providers.enc`, `master.key`,
  `almanac.json`, `checkpoints/`)

First launch auto-migrates (copy-once, never overwrites) from the legacy
TUI paths (`kiro-horror-tui`). Shared, never migrated: the mbox broadcast
dir (`BCAST_DIR`), `~/.config/muse/auth.json`, `~/.kiro/`.
`/vps` keeps the remote TUI in tmux (V1).

## Inter-agent communication

Two layers, both ported:

- **Bus** (in-process): chats and sub-agents talk (`/tell`, `/ask`,
  `/msg`, `/link`, `/unlink`, `/links`), queued delivery, 8-hop loop cap.
- **Mailbox** (broadcast v2 mirror): file-backed agent mailbox —
  P0/P1/P2 messages, `O-AAAAMMJJ-NNN` orders + acks, tokens, throttle,
  digest, 15 s probe, `--mbox` CLI and typed commands.

## Rules

- Files < 500 lines AND ≤ 30 functions; functions < 50 lines
  (`grep -cE 'fn [a-zA-Z_][a-zA-Z0-9_]* *\('`); zero duplication.
- Secrets never logged (manual redacted `Debug`s; `debug_redacted` tests).
- CI: every job ≤ 5 min (`ci-budget` guard); checks `fmt`, `clippy`,
  `build`, `test` required by the Mergify queue.
