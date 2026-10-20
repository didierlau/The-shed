<script lang="ts">
  import { untrack } from 'svelte';
  import { CUSTOM_SPECS, MIN_ITEMS, customDrillId, groupOfKind, type DrillKind } from '../core/drills';
  import { loadCustomSelection, saveCustomSelection } from '../storage/custom';

  let { kind }: { kind: DrillKind } = $props();

  const spec = $derived(CUSTOM_SPECS[kind]);
  const group = $derived(groupOfKind(kind));
  // The page is re-created per kind (see App), so reading the initial kind is intended.
  let selection = $state(untrack(() => loadCustomSelection(kind)));

  const count = $derived(selection.items.length);
  const ready = $derived(count >= MIN_ITEMS);

  function save() {
    saveCustomSelection(kind, $state.snapshot(selection));
  }

  function toggleItem(value: string) {
    const on = new Set(selection.items);
    if (on.has(value)) on.delete(value);
    else on.add(value);
    // Keep catalogue order so answer buttons always appear in the same place.
    selection.items = spec.items.map((i) => i.value).filter((v) => on.has(v));
    save();
  }

  function setAll(on: boolean) {
    selection.items = on ? spec.items.map((i) => i.value) : [];
    save();
  }

  function toggleOption(optionId: string, value: string, multi: boolean) {
    const current = selection.options[optionId] ?? [];
    if (!multi) selection.options[optionId] = [value];
    else if (current.includes(value)) {
      if (current.length > 1) selection.options[optionId] = current.filter((v) => v !== value);
    } else {
      const order = spec.options.find((o) => o.id === optionId)!.choices.map((c) => c.value);
      selection.options[optionId] = order.filter((v) => v === value || current.includes(v));
    }
    save();
  }

  function start() {
    if (!ready) return;
    save();
    location.hash = `#/drill/${customDrillId(kind)}`;
  }
</script>

<nav><a href={`#/section/${group.id}`}>{group.title}</a></nav>

<h1>Build your own</h1>
<p class="lede">Tick the {spec.noun} you want to practise.</p>

<div class="bar">
  <span class="count">{count} of {spec.items.length} selected</span>
  <span class="quick">
    <button class="link" onclick={() => setAll(true)}>All</button>
    <button class="link" onclick={() => setAll(false)}>None</button>
  </span>
</div>

<div class="chips" class:wide={spec.items.some((i) => i.detail)} role="group" aria-label={spec.noun}>
  {#each spec.items as item (item.value)}
    {@const on = selection.items.includes(item.value)}
    <button class="chip" class:on aria-pressed={on} onclick={() => toggleItem(item.value)}>
      <span>{item.label}</span>
      {#if item.detail}<span class="detail">{item.detail}</span>{/if}
    </button>
  {/each}
</div>

{#each spec.options as option (option.id)}
  <h2>{option.label}</h2>
  <div class="segments" role="group" aria-label={option.label}>
    {#each option.choices as c (c.value)}
      {@const on = selection.options[option.id]?.includes(c.value)}
      <button class="segment" class:on aria-pressed={on} onclick={() => toggleOption(option.id, c.value, option.multi)}>
        {c.label}
      </button>
    {/each}
  </div>
{/each}

<div class="start">
  <button class="primary" onclick={start} disabled={!ready}>
    {ready ? 'Start practising' : `Pick at least ${MIN_ITEMS}`}
  </button>
</div>

<style>
  nav { font-size: var(--step--1); margin-bottom: 1.25rem; }
  nav a { color: var(--dim); text-decoration: none; padding: 0.4rem 0; display: inline-block; }
  nav a::before { content: '‹ '; }

  h1 {
    font-family: var(--font-display);
    font-stretch: condensed;
    font-weight: 700;
    font-size: var(--step-2);
    line-height: 1.1;
    margin: 0 0 0.3rem;
  }
  .lede { margin: 0 0 1.25rem; color: var(--dim); }

  h2 {
    font-family: var(--font-display);
    font-stretch: condensed;
    font-weight: 600;
    font-size: var(--step-1);
    margin: 1.75rem 0 0.5rem;
  }

  .bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    font-size: var(--step--1);
    color: var(--dim);
  }
  .quick { display: flex; gap: 1rem; }
  .link {
    background: none;
    border: 0;
    color: var(--brass);
    padding: 0.5rem 0.25rem;
    min-height: 44px;
  }

  .chips {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));
    gap: 0.5rem;
  }
  .chips.wide { grid-template-columns: 1fr; }

  .chip, .segment {
    min-height: 2.9rem;
    padding: 0.45rem 0.75rem;
    border-radius: 0.6rem;
    border: 1px solid var(--navy-line);
    background: var(--navy-raised);
    color: var(--dim);
  }
  .chips.wide .chip {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    text-align: left;
  }
  .detail { font-size: var(--step--1); opacity: 0.8; }

  .chip.on, .segment.on {
    border-color: var(--brass);
    color: var(--lamp);
    background: color-mix(in srgb, var(--brass) 14%, var(--navy-raised));
  }
  .chip.on .detail { color: var(--brass); opacity: 1; }

  .segments { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .segment { flex: 1 1 auto; }

  /* Start stays reachable with the thumb, however long the list. */
  .start {
    position: sticky;
    bottom: 0;
    margin: 1.75rem -1rem 0;
    padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom));
    background: linear-gradient(to top, var(--navy) 75%, transparent);
  }
  .primary {
    width: 100%;
    min-height: 3.25rem;
    border: 0;
    border-radius: 0.6rem;
    background: var(--brass);
    color: var(--navy);
    font-weight: 700;
  }
  .primary:disabled { background: var(--navy-raised); color: var(--dim); cursor: default; }
</style>
