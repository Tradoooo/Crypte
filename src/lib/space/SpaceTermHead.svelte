<!-- SpaceTermHead.svelte — barre de titre du panneau de chat quand le fond 3D
     est actif (DESIGN §4, §11.1) : trois points (le premier orange), une
     rangée d'onglets (un par chat ouvert, point d'état, +N au-delà de 4,
     bouton +), et ⌘K. Clic = changer de chat, clic milieu = fermer. -->
<script lang="ts">
  import { activeIndex, chats, closeChat, newChat, selectChat } from "../chat/store";
  import { space } from "./store.svelte";
  import { tabsOf } from "./tabs";

  let project = $derived(space.state.projects[0]?.name ?? "crypt");
  let tabs = $derived(tabsOf($chats, $activeIndex, project));

  function pick(event: MouseEvent, index: number): void {
    if (event.button === 1) {
      event.preventDefault();
      void closeChat(index);
      return;
    }
    void selectChat(index);
  }
</script>

<div class="space-thead">
  <span class="dots" aria-hidden="true"><i class="on"></i><i></i><i></i></span>
  <div class="tabs" role="tablist" aria-label="Chats ouverts">
    {#each tabs.shown as tab (tab.key)}
      <button
        class="tab"
        class:active={tab.active}
        role="tab"
        aria-selected={tab.active}
        data-testid={`space-tab-${tab.key}`}
        onclick={(e) => pick(e, Number(tab.key.split(":")[0]))}
        onauxclick={(e) => e.button === 1 && pick(e, Number(tab.key.split(":")[0]))}
      >
        <i class="dot {tab.state}" aria-hidden="true"></i>{tab.label}
      </button>
    {/each}
    {#if tabs.hidden > 0}
      <span class="more" title="{tabs.hidden} autres chats">+{tabs.hidden}</span>
    {/if}
    <button class="tab add" onclick={() => void newChat()} title="Nouveau chat (Ctrl+N)">+</button>
  </div>
  <span class="kbd">⌘K</span>
</div>
