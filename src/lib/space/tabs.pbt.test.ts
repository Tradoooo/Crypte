// tabs.pbt.test.ts — propriétés fast-check sur les onglets de chats.
//
// Les cas figés (6 chats dans 360 px, etc.) sont dans `tabs.test.ts` ;
// ici on prouve les invariants pour *n'importe quel* nombre de chats et
// *n'importe quelle* largeur de panneau.
//
// Invariants prouvés :
//   T1 — l'onglet actif est toujours visible ;
//   T2 — shown + hidden = nombre total de chats ;
//   T3 — ce qui est montré tient dans la place disponible (shown <= max) ;
//   T4 — le nombre d'onglets montrés ne croît jamais avec la largeur
//        (plus de place = plus d'onglets, jamais moins) ;
//   T5 — le libellé ne dépasse jamais la longueur maximale.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { ChatSummary } from "../contracts";
import {
  ADD_CHROME,
  fitTabs,
  LABEL_MAX,
  MIN_TAB_WIDTH,
  tabLabel,
  tabsOf,
  TAB_GAP,
} from "./tabs";

const CW = 7.2; // chasse du mono 12 px

/// Un chat quelconque (état, nom, index).
function chatArb(index: number): fc.Arbitrary<ChatSummary> {
  return fc.record({
    name: fc.stringMatching(/^[a-zA-Z0-9 _-]{1,30}$/),
    sending: fc.boolean(),
    questionPending: fc.boolean(),
  }).map((r) => ({
    index,
    name: r.name,
    model: null,
    sending: r.sending,
    questionPending: r.questionPending,
    promptTokens: 0,
    completionTokens: 0,
  }));
}

/// Une liste de chats (0 à 12) et l'index actif.
function chatsArb(): fc.Arbitrary<{ chats: ChatSummary[]; active: number }> {
  return fc
    .array(fc.integer({ min: 0, max: 11 }), { minLength: 0, maxLength: 12 })
    .map((idxs) => {
      const chats = idxs.map((i, k) => ({
        index: k,
        name: `chat-${k + 1}`,
        model: null,
        sending: i % 2 === 0,
        questionPending: i % 3 === 0,
        promptTokens: 0,
        completionTokens: 0,
      }));
      return { chats, active: 0 };
    });
}

describe("tabs (property-based)", () => {
  it("T1 : l'onglet actif est toujours visible", () => {
    fc.assert(
      fc.property(
        chatsArb(),
        fc.integer({ min: 0, max: 1200 }),
        ({ chats }, width) => {
          if (chats.length === 0) return;
          const active = 0;
          const tabs = tabsOf(chats, active);
          const { shown } = fitTabs(tabs, width, CW);
          expect(shown.some((t) => t.active)).toBe(true);
        },
      ),
      { numRuns: 120 },
    );
  });

  it("T2 : shown + hidden = total des chats", () => {
    fc.assert(
      fc.property(
        chatsArb(),
        fc.integer({ min: 0, max: 1200 }),
        ({ chats }, width) => {
          const tabs = tabsOf(chats, 0);
          const { shown, hidden } = fitTabs(tabs, width, CW);
          expect(shown.length + hidden).toBe(tabs.length);
        },
      ),
      { numRuns: 120 },
    );
  });

  it("T3 : ce qui est montré tient dans la place disponible", () => {
    fc.assert(
      fc.property(
        chatsArb(),
        fc.integer({ min: 120, max: 1600 }),
        ({ chats }, width) => {
          const tabs = tabsOf(chats, 0);
          const { shown, hidden } = fitTabs(tabs, width, CW);
          const besoin = shown.length * MIN_TAB_WIDTH + Math.max(0, shown.length - 1) * TAB_GAP;
          const plus = hidden > 0 ? 16 + String(hidden).length * CW : 0;
          expect(besoin + plus + ADD_CHROME + CW).toBeLessThanOrEqual(width + 1);
        },
      ),
      { numRuns: 120 },
    );
  });

  it("T4 : plus de place = plus (ou autant) d'onglets visibles", () => {
    fc.assert(
      fc.property(chatsArb(), ({ chats }) => {
        const tabs = tabsOf(chats, 0);
        let precedent = 0;
        for (let width = 120; width <= 1600; width += 40) {
          const { shown } = fitTabs(tabs, width, CW);
          expect(shown.length).toBeGreaterThanOrEqual(precedent);
          precedent = shown.length;
        }
      }),
      { numRuns: 40 },
    );
  });

  it("T5 : le libellé ne dépasse jamais la longueur maximale", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 60 }), (name) => {
        const label = tabLabel(name);
        expect(label.length).toBeLessThanOrEqual(LABEL_MAX);
      }),
      { numRuns: 120 },
    );
  });
});
