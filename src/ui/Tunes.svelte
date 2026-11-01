<script lang="ts">
  import { parseIRealPro } from '../core/tunes';
  import { addCharts, loadTunes } from '../storage/tunes';
  import { pretty } from '../core/tunes';

  let tunes = $state(loadTunes());
  let query = $state('');
  let pasted = $state('');
  let message = $state<{ text: string; ok: boolean } | null>(null);
  let showImport = $state(loadTunes().length === 0);

  const sorted = $derived(
    tunes
      .filter((t) => !query || `${t.title} ${t.composer}`.toLowerCase().includes(query.trim().toLowerCase()))
      .sort((a, b) => a.title.localeCompare(b.title)),
  );

  function importText(text: string) {
    const charts = parseIRealPro(text);
    if (charts.length === 0) {
      message = { ok: false, text: 'No iReal Pro tunes found. Paste an irealb:// link, or pick the HTML file iReal Pro exports.' };
      return;
    }
    const result = addCharts(charts);
    if (!result) {
      message = { ok: false, text: 'This device would not store that many tunes. Try a smaller playlist.' };
      return;
    }
    tunes = loadTunes();
    pasted = '';
    if (charts.length === 1) {
      location.hash = `#/tune/${result.ids[0]}`;
      return;
    }
    const parts = [`${result.added} tune${result.added === 1 ? '' : 's'} added`];
    if (result.replaced) parts.push(`${result.replaced} updated`);
    message = { ok: true, text: parts.join(', ') + '.' };
    showImport = false;
  }

  async function onFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) importText(await file.text());
    input.value = '';
  }
</script>

<nav><a href="#/">The Shed</a></nav>

<h1>Tunes</h1>
<p class="lede">Import a chart from iReal Pro or type the changes, then see how the tune works: key centres, ii–Vs, what each chord does and which scales fit.</p>

<div class="actions">
  <button class="action" class:on={showImport} onclick={() => (showImport = !showImport)}>Import from iReal Pro</button>
  <a class="action" href="#/tune-edit/new">Type the changes</a>
</div>

{#if showImport}
  <section class="import">
    <p>In iReal Pro, share a song or a whole playlist as <strong>iReal Pro (HTML)</strong> and pick that file here, or paste an <code>irealb://</code> link.</p>
    <label class="file">
      <input type="file" accept=".html,.htm,.txt,text/html,text/plain" onchange={onFile} />
      <span>Choose file…</span>
    </label>
    <textarea bind:value={pasted} rows="3" placeholder="irealb://…" aria-label="iReal Pro link"></textarea>
    <button class="go" disabled={!pasted.trim()} onclick={() => importText(pasted)}>Import link</button>
  </section>
{/if}

{#if message}
  <p class="message" class:bad={!message.ok} role="status">{message.text}</p>
{/if}

{#if tunes.length > 8}
  <input class="search" type="search" bind:value={query} placeholder={`Search ${tunes.length} tunes`} aria-label="Search tunes" />
{/if}

{#if tunes.length}
  <ul>
    {#each sorted as t (t.id)}
      <li>
        <a href={`#/tune/${t.id}`}>
          <span class="title">{t.title}</span>
          <span class="desc">{[t.composer, t.style].filter(Boolean).join(' · ') || 'Typed changes'}</span>
          <span class="key">{pretty((/^Key:\s*(\S+)/m.exec(t.text)?.[1] ?? '').replace(/m$/, ' minor'))}</span>
        </a>
      </li>
    {/each}
  </ul>
  {#if query && sorted.length === 0}<p class="lede">No tune matches “{query}”.</p>{/if}
{:else}
  <p class="lede">No tunes yet.</p>
{/if}

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
    margin: 0 0 0.5rem;
  }
  .lede { margin: 0 0 1rem; color: var(--dim); font-size: var(--step--1); }

  .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 1rem; }
  .action {
    display: grid;
    place-items: center;
    min-height: 3rem;
    padding: 0.4rem 0.6rem;
    border-radius: 0.6rem;
    border: 1px solid var(--navy-line);
    background: var(--navy-raised);
    color: var(--lamp);
    text-decoration: none;
    text-align: center;
    font-size: var(--step--1);
  }
  .action.on { border-color: var(--brass); }

  .import {
    display: grid;
    gap: 0.6rem;
    padding: 0.9rem;
    margin-bottom: 1rem;
    border: 1px solid var(--navy-line);
    border-radius: 0.6rem;
    font-size: var(--step--1);
  }
  .import p { margin: 0; color: var(--dim); }
  .import strong { color: var(--lamp); }
  code { font-size: 0.85em; }
  .file input { position: absolute; opacity: 0; width: 1px; height: 1px; }
  .file span, .go {
    display: grid;
    place-items: center;
    min-height: 2.9rem;
    border-radius: 0.6rem;
    border: 1px solid var(--brass-deep);
    background: var(--navy-raised);
    color: var(--brass);
    cursor: pointer;
  }
  .file:focus-within span { outline: 2px solid var(--brass); outline-offset: 3px; }
  .go:disabled { opacity: 0.45; cursor: default; }
  textarea, .search {
    width: 100%;
    font: inherit;
    font-size: var(--step--1);
    color: var(--lamp);
    background: var(--navy-raised);
    border: 1px solid var(--navy-line);
    border-radius: 0.6rem;
    padding: 0.6rem 0.7rem;
  }
  .search { min-height: 2.9rem; margin-bottom: 0.75rem; }

  .message { font-size: var(--step--1); color: var(--right); margin: 0 0 1rem; }
  .message.bad { color: var(--wrong); }

  ul { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--navy-line); }
  li { border-bottom: 1px solid var(--navy-line); }
  li a {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.05rem 1rem;
    padding: 0.75rem 0.25rem;
    color: inherit;
    text-decoration: none;
  }
  li a:active { background: var(--navy-raised); }
  .title { font-family: var(--font-display); font-stretch: condensed; font-weight: 600; font-size: var(--step-1); }
  .desc { grid-column: 1; color: var(--dim); font-size: var(--step--1); }
  .key { grid-column: 2; grid-row: 1 / span 2; align-self: center; color: var(--dim); font-size: var(--step--1); white-space: nowrap; }
</style>
