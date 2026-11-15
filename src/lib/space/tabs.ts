// tabs.ts — onglets de chats du panneau 3D (DESIGN §11.1), purs et testés.
// Le fil unique « projet / chat » devient une rangée d'onglets : un par
// chat ouvert, point d'état (orange = agent actif, blanc = repos,
// rouge = question en attente), 4 max + puce « +N », bouton « + ».
import type { ChatSummary } from "../contracts";

export type TabState = "running" | "asking" | "idle";

export interface ChatTab {
  key: string;
  label: string;
  state: TabState;
  active: boolean;
}

/// Onglets visibles au plus (`+N` porte le reste).
export const MAX_TABS = 4;

/// Libellé « projet / chat », coupé à 18 caractères (ellipse en fin).
export function tabLabel(project: string, chat: string): string {
  const label = `${project} / ${chat}`;
  return label.length > 18 ? `${label.slice(0, 17)}…` : label;
}

/// État d'un onglet : la question prime sur l'agent en cours.
export function tabState(summary: Pick<ChatSummary, "sending" | "questionPending">): TabState {
  if (summary.questionPending) return "asking";
  return summary.sending ? "running" : "idle";
}

/// Onglets à montrer : les `MAX_TABS` plus récents, l'actif toujours
/// visible (échangé contre le plus ancien si besoin), et le nombre
/// de chats cachés derrière la puce « +N ».
export function tabsOf(
  chats: ChatSummary[],
  activeIndex: number,
  project: string,
): { shown: ChatTab[]; hidden: number } {
  const tabs: ChatTab[] = chats.map((c) => ({
    key: `${c.index}:${c.name}`,
    label: tabLabel(project, c.name),
    state: tabState(c),
    active: c.index === activeIndex,
  }));
  if (tabs.length <= MAX_TABS) return { shown: tabs, hidden: 0 };
  const recent = tabs.slice(tabs.length - MAX_TABS);
  if (recent.some((t) => t.active)) return { shown: recent, hidden: tabs.length - recent.length };
  const active = tabs[activeIndex];
  const shown = [active, ...recent.slice(1)];
  return { shown, hidden: tabs.length - shown.length };
}
