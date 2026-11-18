// demo.ts — mode démo hors-ligne du chat (aucune clé, aucun réseau).
//
// Un juge qui lance l'app sans fournisseur connecté voit la crypte vide côté
// chat : ce module rejoue une session d'agents sur le projet `crypt` (même
// histoire que `src/lib/space/demo.ts`, le fond 3D), sans backend.
//
// Tout passe par des étapes **pures** (`applyStep`) : le runner n'orchestre
// que le tempo. Les stores reçoivent les mêmes formes que le backend
// (`contracts.ts`), donc aucun écran n'a besoin de savoir qu'on est en démo.

import type {
  AgentStatus,
  ChatMessage,
  ChatState,
  ChatSummary,
  Role,
  SubAgentInfo,
} from "../contracts";

/// État interne du démo : trois chats ouverts, agents, message en vol.
export interface DemoState {
  chats: ChatDraft[];
  active: number;
  agents: SubAgentInfo[];
}

/// Brouillon d'un chat (même forme que `ChatState`).
export interface ChatDraft {
  index: number;
  name: string;
  model: string | null;
  sending: boolean;
  questionPending: boolean;
  promptTokens: number;
  completionTokens: number;
  messages: ChatMessage[];
}

/// Ce que le runner publie aux stores (formes `contracts.ts`).
export interface DemoHooks {
  chats(list: ChatSummary[]): void;
  state(state: ChatState): void;
  agents(list: SubAgentInfo[]): void;
  active(index: number): void;
  notice(text: string): void;
}

/// Une étape du scénario : un message, un état d'envoi, une sélection,
/// un agent (spawn) ou une livraison.
export type DemoStep =
  | { t: number; kind: "select"; chat: number }
  | { t: number; kind: "message"; chat: number; role: Role; text: string }
  | { t: number; kind: "sending"; chat: number; on: boolean }
  | { t: number; kind: "agent"; agent: SubAgentInfo }
  | { t: number; kind: "agentStatus"; id: number; status: AgentStatus; text?: string }
  | { t: number; kind: "notice"; text: string };

/// Dossier de données du démo : trois chats, aucun token compté.
const NAMES = ["crypt-fix", "crypt-review", "crypt-release"];

export function demoChats(): DemoState {
  return {
    chats: NAMES.map((name, index) => ({
      index,
      name,
      model: "demo",
      sending: false,
      questionPending: false,
      promptTokens: 0,
      completionTokens: 0,
      messages: [],
    })),
    active: 0,
    agents: [],
  };
}

/// Formes publiées aux stores (résumé sans le brouillon de messages).
function summaries(state: DemoState): ChatSummary[] {
  return state.chats.map(({ messages: _messages, ...rest }) => rest);
}

function chatState(state: DemoState, index: number): ChatState {
  const draft = state.chats[index];
  return draft ? { ...draft, input: "", pendingQuestion: null } : draft;
}

/// Applique une étape (pur) et publie l'état complet aux hooks.
export function applyStep(state: DemoState, step: DemoStep, hooks: DemoHooks): void {
  switch (step.kind) {
    case "select":
      state.active = step.chat;
      hooks.active(step.chat);
      hooks.state(chatState(state, step.chat));
      break;
    case "message": {
      const draft = state.chats[step.chat];
      if (!draft) break;
      draft.messages.push({ role: step.role, text: step.text });
      if (step.role === "assistant") draft.completionTokens += estimate(step.text);
      else draft.promptTokens += estimate(step.text);
      if (step.chat === state.active) hooks.state(chatState(state, step.chat));
      break;
    }
    case "sending": {
      const draft = state.chats[step.chat];
      if (!draft) break;
      draft.sending = step.on;
      break;
    }
    case "agent": {
      state.agents = [...state.agents.filter((a) => a.id !== step.agent.id), step.agent];
      hooks.agents(state.agents);
      break;
    }
    case "agentStatus": {
      state.agents = state.agents.map((a) =>
        a.id === step.id ? { ...a, status: step.status, lastText: step.text ?? a.lastText } : a,
      );
      hooks.agents(state.agents);
      break;
    }
    case "notice":
      hooks.notice(step.text);
      break;
  }
  hooks.chats(summaries(state));
}

/// Comptage approximatif de tokens (4 caractères ≈ 1 token, comme le TUI).
function estimate(text: string): number {
  return Math.max(1, Math.round(text.length / 4));
}

/// Le scénario : la même histoire que le fond 3D (`space/demo.ts`) —
/// le fantôme lit `server.rs` et le log d'erreurs, deux sous-agents
/// partent en parallèle, il corrige `encode.rs`, Kiro juge, réponse,
/// puis F7. Durée ≈ 24 s.
export function chatDemoScript(): DemoStep[] {
  const user: DemoStep = {
    t: 0.5,
    kind: "message",
    chat: 0,
    role: "user",
    text: "The hub crashes on startup: encode() panics on an empty log. Find the cause and fix it.",
  };
  return [
    user,
    { t: 1.0, kind: "sending", chat: 0, on: true },
    { t: 1.4, kind: "message", chat: 0, role: "system", text: "Reading AGENTS.md + .kiro/steering (always)." },
    { t: 3.2, kind: "message", chat: 0, role: "assistant", text: "On it. I'll read src/hub/server.rs and logs/error.log, then trace the panic in encode()." },
    { t: 4.0, kind: "agent", agent: agent(1, "Read deploy/nginx.conf and check the log rotation", 0) },
    { t: 4.3, kind: "agent", agent: agent(2, "Web: known upstream issue with empty gRPC frames", 1) },
    { t: 6.4, kind: "agentStatus", id: 1, status: "done", text: "nginx rotates at 5 MB — log empty is expected there, not the cause." },
    { t: 8.2, kind: "message", chat: 0, role: "assistant", text: "Found it: encode() indexes frames[0] before the first Kitty frame exists. Guard + fallback." },
    { t: 9.0, kind: "sending", chat: 0, on: false },
    { t: 10.2, kind: "agentStatus", id: 2, status: "done", text: "Upstream issue #412 — fixed in 0.9.4, our vendored copy is older." },
    { t: 11.6, kind: "message", chat: 0, role: "user", text: "Apply the fix and add a regression test." },
    { t: 12.1, kind: "sending", chat: 0, on: true },
    { t: 15.4, kind: "message", chat: 0, role: "assistant", text: "Done: src/hub/encode.rs guards the empty case, encode_empty_log regression added. 12 tests green, cargo fmt clean." },
    { t: 16.2, kind: "sending", chat: 0, on: false },
    { t: 17.0, kind: "message", chat: 1, role: "user", text: "Review the diff on encode.rs (checkpoint 3)." },
    { t: 17.4, kind: "select", chat: 1 },
    { t: 19.6, kind: "message", chat: 1, role: "assistant", text: "LGTM overall — one nit: the guard uses `unwrap_or_default()`, prefer an explicit early return with a log line." },
    { t: 20.6, kind: "select", chat: 0 },
    { t: 21.4, kind: "notice", text: "Press F7 — every project you run is drawn in the crypt." },
    { t: 22.6, kind: "message", chat: 2, role: "user", text: "Prepare release notes for the fix." },
    { t: 24.0, kind: "message", chat: 2, role: "assistant", text: "Draft ready: « Fix a startup panic when the hub log is empty (regression test included). »" },
  ];
}

function agent(id: number, prompt: string, owner: number): SubAgentInfo {
  return { id, owner, deliver: owner, status: "running", prompt, lastText: null };
}

/// Réponses scriptées du démo : quand le juge envoie son propre message,
/// le fantôme répond hors-ligne (aucun réseau, aucune clé).
const REPLIES: string[] = [
  "Demo mode: no provider connected, so this crypt answers from its script. Connect a provider in /settings to talk for real.",
  "Still offline (demo). The 3D background and the agents replay stay yours to explore — press F7.",
];

export function demoReply(count: number): string {
  return REPLIES[count % REPLIES.length];
}

/// Runner : publie l'état initial puis programme chaque étape. `schedule`
/// est injectable (vitest utilise une file figée, pas un vrai timer).
export type Schedule = (fn: () => void, ms: number) => () => void;

export interface ChatDemo {
  /** Arrête le démo (annule les étapes programmées). */
  stop(): void;
  /** Message du juge : réponse scriptée hors-ligne. */
  send(text: string): void;
  /** L'état interne (vitest : assertions sur les brouillons). */
  state(): DemoState;
}

export function startChatDemo(hooks: DemoHooks, schedule: Schedule = realSchedule): ChatDemo {
  const state = demoChats();
  const stopTimers: (() => void)[] = [];
  hooks.chats(summaries(state));
  hooks.agents([]);
  hooks.active(0);
  hooks.state(chatState(state, 0));
  let replies = 0;
  for (const step of chatDemoScript()) {
    stopTimers.push(schedule(() => applyStep(state, step, hooks), step.t * 1000));
  }
  const send = (text: string): void => {
    const chat = state.active;
    applyStep(state, { t: 0, kind: "message", chat, role: "user", text }, hooks);
    applyStep(state, { t: 0, kind: "sending", chat, on: true }, hooks);
    stopTimers.push(
      schedule(() => {
        applyStep(state, { t: 0, kind: "sending", chat, on: false }, hooks);
        applyStep(
          state,
          { t: 0, kind: "message", chat, role: "assistant", text: demoReply(replies++) },
          hooks,
        );
      }, 1200),
    );
  };
  return { stop: () => stopTimers.forEach((stop) => stop()), send, state: () => state };
}

function realSchedule(fn: () => void, ms: number): () => void {
  const id = window.setTimeout(fn, ms);
  return () => window.clearTimeout(id);
}

/// Compte les messages d'assistant (pour vérifier qu'une réponse arrive).
export function assistantCount(state: DemoState, chat: number): number {
  return state.chats[chat]?.messages.filter((m) => m.role === "assistant").length ?? 0;
}
