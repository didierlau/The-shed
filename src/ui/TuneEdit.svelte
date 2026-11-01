<script lang="ts">
  import { untrack } from 'svelte';
  import { parseTypedChart } from '../core/tunes';
  import { deleteTune, findTune, saveTypedTune } from '../storage/tunes';

  let { id }: { id: string | undefined } = $props();

  const existing = untrack(() => (id ? findTune(id) : undefined));
  let title = $state(existing?.title ?? '');
  let composer = $state(existing?.composer ?? '');
  let text = $state(existing?.text ?? 'Key: ');
  let error = $state('');

  const parsed = $derived(parseTypedChart(text, { title, composer }));

  function save() {
    if (parsed.chart.bars.length === 0) {
      error = 'Type at least one bar of chords.';
      return;
    }
    const saved = saveTypedTune(existing?.id, { title: title.trim() || 'Untitled', composer: composer.trim(), text: text.trim() });
    if (!saved) {
      error = 'This device would not save the tune.';
      return;
    }
    location.hash = `#/tune/${saved}`;
  }

  let confirmDelete = $state(false);
  function remove() {
    if (!existing) return;
    if (!confirmDelete) {
      confirmDelete = true;
      return;
    }
    deleteTune(existing.id);
    location.hash = '#/tunes';
  }
</script>

<nav><a href={existing ? `#/tune/${existing.id}` : '#/tunes'}>{existing ? existing.title : 'Tunes'}</a></nav>

<h1>{existing ? 'Edit changes' : 'Type the changes'}</h1>

<label>
  <span>Title</span>
  <input bind:value={title} placeholder="All the Things You Are" />
</label>
<label>
  <span>Composer</span>
  <input bind:value={composer} placeholder="Optional" />
</label>
<label>
  <span>Changes</span>
  <textarea bind:value={text} rows="12" spellcheck="false" autocapitalize="off" autocomplete="off"
    placeholder={'Key: Ab\nA: Fm7 | Bbm7 | Eb7 | Abmaj7 |\nDbmaj7 | Dm7 G7 | Cmaj7 | % |'}></textarea>
</label>

<p class="help">
  Bars between <code>|</code>, chords in a bar separated by spaces (they share the bar; <code>/</code> adds a beat).
  <code>%</code> repeats the bar before. Start a line with <code>A:</code> or <code>[Bridge]</code> to mark a section.
  <code>Key: Eb</code> or <code>Key: Cm</code> sets the key (otherwise it’s worked out), <code>Time: 3/4</code> the metre.
  Cm7, C-7 · Cmaj7, C^7, CΔ7 · Cm7b5, Cø7, Ch7 · Cdim7, C°7 all work.
</p>

<p class="status" class:bad={parsed.unknown.length > 0}>
  {parsed.chart.bars.length} bar{parsed.chart.bars.length === 1 ? '' : 's'} read{#if parsed.unknown.length}; not chords: {parsed.unknown.slice(0, 6).join(', ')}{/if}
</p>

{#if error}<p class="status bad" role="alert">{error}</p>{/if}

<div class="buttons">
  <button class="primary" onclick={save}>Save and analyse</button>
  {#if existing}<button class="danger" onclick={remove}>{confirmDelete ? 'Tap again to delete' : 'Delete tune'}</button>{/if}
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
    margin: 0 0 1rem;
  }
  label { display: grid; gap: 0.3rem; margin-bottom: 0.8rem; }
  label span { color: var(--dim); font-size: var(--step--1); }
  input, textarea {
    width: 100%;
    font: inherit;
    color: var(--lamp);
    background: var(--navy-raised);
    border: 1px solid var(--navy-line);
    border-radius: 0.6rem;
    padding: 0.6rem 0.7rem;
  }
  input { min-height: 2.9rem; }
  textarea { font-family: ui-monospace, 'Roboto Mono', monospace; font-size: 0.95rem; line-height: 1.6; }
  .help { color: var(--dim); font-size: var(--step--1); margin: 0 0 0.8rem; }
  code { color: var(--lamp); font-size: 0.9em; }
  .status { font-size: var(--step--1); color: var(--right); margin: 0 0 0.8rem; }
  .status.bad { color: var(--wrong); }
  .buttons { display: grid; gap: 0.6rem; margin-top: 1rem; }
  .buttons button { min-height: 3rem; border-radius: 0.6rem; font-size: var(--step-0); }
  .primary { border: none; background: var(--brass); color: var(--navy); font-weight: 600; }
  .danger { border: 1px solid var(--navy-line); background: transparent; color: var(--wrong); }
</style>
