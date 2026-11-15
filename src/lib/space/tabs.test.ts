// tabs.test.ts — onglets de chats du panneau 3D (DESIGN §11.1).
import { describe, expect, it } from "vitest";
import type { ChatSummary } from "../contracts";
import { MAX_TABS, tabLabel, tabState, tabsOf } from "./tabs";

function chat(i: number, name = `chat-${i + 1}`, extra: Partial<ChatSummary> = {}): ChatSummary {
  return {
    index: i,
    name,
    model: null,
    sending: false,
    questionPending: false,
    promptTokens: 0,
    completionTokens: 0,
    ...extra,
  };
}

describe("tabLabel", () => {
  it("assemble « projet / chat » et coupe à 18 caractères", () => {
    expect(tabLabel("crypt", "chat-1")).toBe("crypt / chat-1");
    const cut = tabLabel("long-project-name", "chat-number-9");
    expect(cut.length).toBe(18);
    expect(cut.endsWith("…")).toBe(true);
  });
});

describe("tabState", () => {
  it("question en attente > agent en cours > repos", () => {
    expect(tabState({ sending: true, questionPending: true })).toBe("asking");
    expect(tabState({ sending: true, questionPending: false })).toBe("running");
    expect(tabState({ sending: false, questionPending: false })).toBe("idle");
  });
});

describe("tabsOf", () => {
  it("jusqu'à 4 onglets : tout est montré, rien de caché", () => {
    const { shown, hidden } = tabsOf([chat(0), chat(1), chat(2)], 1, "crypt");
    expect(shown.map((t) => t.label)).toEqual([
      "crypt / chat-1",
      "crypt / chat-2",
      "crypt / chat-3",
    ]);
    expect(shown[1].active).toBe(true);
    expect(hidden).toBe(0);
  });

  it("au-delà : les 4 plus récents + puce +N, l'actif reste visible", () => {
    const many = [0, 1, 2, 3, 4, 5, 6].map((i) => chat(i));
    const recent = tabsOf(many, 6, "crypt");
    expect(recent.shown.length).toBe(MAX_TABS);
    expect(recent.shown.map((t) => t.key)).toEqual(["3:chat-4", "4:chat-5", "5:chat-6", "6:chat-7"]);
    expect(recent.hidden).toBe(3);

    // L'actif est l'ancien chat-1 : il remplace le plus ancien des récents.
    const old = tabsOf(many, 0, "crypt");
    expect(old.shown[0].key).toBe("0:chat-1");
    expect(old.shown[0].active).toBe(true);
    expect(old.hidden).toBe(3);
  });
});
