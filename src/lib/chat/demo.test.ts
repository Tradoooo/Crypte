// demo.test.ts — mode démo hors-ligne du chat (aucune clé, aucun réseau).
//
// Le runner est piloté par une file de timers factices : aucune horloge
// réelle, aucun等待, le scénario est vérifié pas à pas.
import { describe, expect, it } from "vitest";
import type { ChatState, ChatSummary, SubAgentInfo } from "../contracts";
import {
  applyStep,
  chatDemoScript,
  demoChats,
  demoReply,
  startChatDemo,
  type DemoHooks,
  type DemoState,
} from "./demo";

/// File de timers factices : rien ne part tout seul, on avance à la main.
function fakeClock() {
  const pending: { at: number; fn: () => void }[] = [];
  let now = 0;
  return {
    schedule: (fn: () => void, ms: number): (() => void) => {
      const at = now + ms;
      pending.push({ at, fn });
      return () => {
        const i = pending.findIndex((p) => p.fn === fn);
        if (i >= 0) pending.splice(i, 1);
      };
    },
    /** Avance le temps et exécute les étapes échues (dans l'ordre). */
    advance(ms: number): void {
      now += ms;
      const due = pending.filter((p) => p.at <= now).sort((a, b) => a.at - b.at);
      for (const step of due) {
        const i = pending.indexOf(step);
        if (i >= 0) pending.splice(i, 1);
        step.fn();
      }
    },
    get size(): number {
      return pending.length;
    },
  };
}

/// Hooks de test : on garde le dernier état publié.
function hooks() {
  const seen = {
    chats: [] as ChatSummary[],
    states: [] as ChatState[],
    agents: [] as SubAgentInfo[],
    active: -1,
    notices: [] as string[],
  };
  const h: DemoHooks = {
    chats: (list) => (seen.chats = list),
    state: (state) => seen.states.push(state),
    agents: (list) => (seen.agents = list),
    active: (index) => (seen.active = index),
    notice: (text) => seen.notices.push(text),
  };
  return { h, seen };
}

describe("demo hors-ligne", () => {
  it("publie trois chats peuplés dès le départ", () => {
    const { h, seen } = hooks();
    const clock = fakeClock();
    startChatDemo(h, clock.schedule);
    expect(seen.chats).toHaveLength(3);
    expect(seen.chats.map((c) => c.name)).toEqual(["crypt-fix", "crypt-review", "crypt-release"]);
    expect(seen.active).toBe(0);
    expect(seen.states[0].messages).toHaveLength(0);
  });

  it("rejoue la session : message, agents, réponses, sélection", () => {
    const { h, seen } = hooks();
    const clock = fakeClock();
    startChatDemo(h, clock.schedule);
    clock.advance(30000);
    // Le premier chat a reçu le prompt du juge et des réponses.
    const state = seen.states[seen.states.length - 1];
    expect(state.messages.length).toBeGreaterThan(2);
    expect(state.messages.some((m) => m.role === "user")).toBe(true);
    expect(state.messages.some((m) => m.role === "assistant")).toBe(true);
    // Les deux sous-agents sont passés par « done ».
    expect(seen.agents.length).toBe(2);
    expect(seen.agents.every((a) => a.status === "done")).toBe(true);
    // La sélection a changé (chat 1 actif à un moment).
    expect(seen.active).toBe(0);
  });

  it("le juge peut écrire : réponse hors-ligne, aucun appel réseau", () => {
    const { h, seen } = hooks();
    const clock = fakeClock();
    const demo = startChatDemo(h, clock.schedule);
    clock.advance(30000);
    const before = seen.states[seen.states.length - 1].messages.length;
    demo.send("what about the web build?");
    clock.advance(2000);
    const after = seen.states[seen.states.length - 1].messages;
    expect(after.length).toBeGreaterThan(before);
    expect(after[after.length - 1].role).toBe("assistant");
    expect(after[after.length - 1].text.toLowerCase()).toContain("demo");
  });

  it("stop annule les étapes programmées", () => {
    const { h } = hooks();
    const clock = fakeClock();
    const demo = startChatDemo(h, clock.schedule);
    expect(clock.size).toBeGreaterThan(0);
    demo.stop();
    expect(clock.size).toBe(0);
  });

  it("les étapes sont croissantes dans le temps", () => {
    const script = chatDemoScript();
    for (let i = 1; i < script.length; i += 1) {
      expect(script[i].t).toBeGreaterThanOrEqual(script[i - 1].t);
    }
  });

  it("applyStep est pur : l'état ne bouge que par l'étape", () => {
    const { h } = hooks();
    const state: DemoState = demoChats();
    applyStep(state, { t: 0, kind: "message", chat: 0, role: "user", text: "hello" }, h);
    expect(state.chats[0].messages).toHaveLength(1);
    expect(state.chats[0].promptTokens).toBeGreaterThan(0);
    applyStep(state, { t: 0, kind: "sending", chat: 0, on: true }, h);
    expect(state.chats[0].sending).toBe(true);
    applyStep(state, { t: 0, kind: "select", chat: 2 }, h);
    expect(state.active).toBe(2);
  });

  it("les réponses scriptées tournent en boucle", () => {
    expect(demoReply(0)).not.toBe(demoReply(1));
    expect(demoReply(2)).toBe(demoReply(0));
  });
});
