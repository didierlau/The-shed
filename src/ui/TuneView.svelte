<script lang="ts">
  import { untrack } from 'svelte';
  import { analyseChart, chartPlayback, chordVoicing, displayChord, keyName, pretty, scalePlayback, shortKeyName, type AnalysedChord, type ScaleChoice } from '../core/tunes';
  import { SCALES } from '../core/scales';
  import { findTune, tuneChart } from '../storage/tunes';
  import { player } from '../audio/player';

  let { id }: { id: string } = $props();

  const saved = untrack(() => findTune(id));
  const chart = saved ? tuneChart(saved) : null;
  const analysis = chart ? analyseChart(chart) : null;

  let selected = $state<number | null>(null);
  let tempo = $state(120);
  let playing = $state<string | null>(null);
  let ticket = 0;

  /** Bars grouped by section, each bar listing the indices of its chords in the analysis. */
  const sections = $derived.by(() => {
    if (!chart || !analysis) return [];
    const out: { label: string; bars: { number: number; chords: number[]; comment?: string }[] }[] = [];
    chart.bars.forEach((bar, b) => {
      if (b === 0 || bar.section) out.push({ label: bar.section ?? '', bars: [] });
      out.at(-1)!.bars.push({ number: b + 1, chords: [], ...(bar.comment ? { comment: bar.comment } : {}) });
    });
    const byBar = out.flatMap((s) => s.bars);
    analysis.chords.forEach((c, i) => byBar[c.bar]!.chords.push(i));
    return out;
  });

  const keyChanges = $derived.by(() => {
    const marks = new Set<number>();
    analysis?.chords.forEach((c, i) => {
      const prev = analysis.chords[i - 1];
      if (c.facts && (!prev || prev.key.tonic !== c.key.tonic || prev.key.mode !== c.key.mode)) marks.add(i);
    });
    return marks;
  });

  const current = $derived(selected !== null && analysis ? analysis.chords[selected]! : null);

  async function play(what: string, steps: ReturnType<typeof chartPlayback>, opts: { tempo?: number } = {}) {
    const mine = ++ticket;
    if (playing === what) {
      player.stop();
      playing = null;
      return;
    }
    playing = what;
    try {
      await player.play(steps, opts);
    } finally {
      if (mine === ticket) playing = null;
    }
  }

  /** Keep the chosen chord visible above the details panel. */
  function reveal(i: number) {
    requestAnimationFrame(() => {
      const r = document.getElementById(`chord-${i}`)?.getBoundingClientRect();
      if (r && (r.bottom > innerHeight * 0.42 || r.top < 0)) scrollBy({ top: r.top - innerHeight * 0.18, behavior: 'smooth' });
    });
  }

  function select(i: number) {
    selected = selected === i ? null : i;
    if (selected !== null && analysis) {
      const c = analysis.chords[selected]!;
      if (c.facts) void play(`chord-${i}`, [{ notes: chordVoicing(c.symbol), beats: 2 }]);
      reveal(i);
    }
  }

  function step(delta: number) {
    if (!analysis || selected === null) return;
    let i = selected;
    do i = (i + delta + analysis.chords.length) % analysis.chords.length;
    while (!analysis.chords[i]!.facts && i !== selected);
    selected = i;
    void play(`chord-${i}`, [{ notes: chordVoicing(analysis.chords[i]!.symbol), beats: 2 }]);
    reveal(i);
  }

  function jumpTo(i: number) {
    selected = i;
    reveal(i);
  }

  const scaleTitle = (s: ScaleChoice) => `${pretty(s.root)} ${SCALES[s.name].label}`;
  const notes = (list: string[]) => list.map(pretty).join(' ');
  const arrow = (c: AnalysedChord) => (c.resolves === 'fifth' ? ' →' : c.resolves === 'half-step' ? ' ⇢' : '');

  $effect(() => () => player.stop());
</script>

<nav><a href="#/tunes">Tunes</a></nav>

{#if !chart || !analysis || !saved}
  <h1>Tune not found</h1>
  <p class="lede">It may have been deleted on this device.</p>
{:else}
  <header>
    <h1>{chart.title}</h1>
    <p class="meta">{[chart.composer, chart.style].filter(Boolean).join(' · ')}</p>
    <a class="edit" href={`#/tune-edit/${saved.id}`}>Edit</a>
  </header>

  <section class="overview">
    <p class="form">{analysis.formSummary} · {keyName(analysis.homeKey)}</p>
    <ul>
      {#each analysis.highlights.slice(1) as line}<li>{line}</li>{/each}
    </ul>
  </section>

  <div class="transport">
    <button class="play" class:on={playing === 'all'} onclick={() => play('all', chartPlayback(chart), { tempo })}>
      {playing === 'all' ? '■ Stop' : '▶ Play the changes'}
    </button>
    <label class="tempo">
      <span>♩ =</span>
      <select bind:value={tempo} aria-label="Tempo">
        {#each [60, 90, 120, 160, 200] as t}<option value={t}>{t}</option>{/each}
      </select>
    </label>
  </div>

  <p class="hint">Tap a chord to hear it and see what it does. <span class="legend"><span class="bracket-demo"></span> ii–V</span> → resolves down a fifth, ⇢ tritone sub.</p>

  {#each sections as section}
    <section class="chart-section">
      {#if section.label}<h2 class="label">{section.label}</h2>{/if}
      <div class="bars">
        {#each section.bars as bar (bar.number)}
          <div class="bar" class:busy={bar.chords.length > 1}>
            <span class="num">{bar.number}</span>
            {#each bar.chords as i (i)}
              {@const c = analysis.chords[i]!}
              <button
                id={`chord-${i}`}
                class="chord"
                class:sel={selected === i}
                class:ii={c.pair === 'ii'}
                class:v={c.pair === 'V'}
                onclick={() => select(i)}
                disabled={!c.facts}
              >
                {#if keyChanges.has(i)}<span class="keytag">{shortKeyName(c.key)}</span>{/if}
                <span class="sym">{displayChord(c.symbol)}</span>
                <span class="roman">{c.roman}{arrow(c)}</span>
              </button>
            {/each}
            {#if bar.comment}<span class="comment">{bar.comment}</span>{/if}
          </div>
        {/each}
      </div>
    </section>
  {/each}

  {#if analysis.patterns.length}
    <section class="patterns">
      <h2>What to look for</h2>
      <ul>
        {#each analysis.patterns as p}
          <li>
            <button onclick={() => jumpTo(p.first)}>
              <span class="bar-no">Bar {p.barNumber}</span>
              <span>{p.label}</span>
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <p class="note">Analysis is worked out from the chords alone (no melody), so treat it as a starting point: a ii–V can often be heard in more than one key.</p>

  {#if current}
    <div class="spacer"></div>
    <aside class="detail" aria-label="Chord details">
      <div class="detail-head">
        <button class="nav-btn" onclick={() => step(-1)} aria-label="Previous chord">‹</button>
        <div class="detail-title">
          <span class="big">{displayChord(current.symbol)}</span>
          <span class="in">{current.roman} in {keyName(current.key)}</span>
        </div>
        <button class="nav-btn" onclick={() => step(1)} aria-label="Next chord">›</button>
        <button class="close" onclick={() => (selected = null)} aria-label="Close">×</button>
      </div>
      <div class="detail-body">
        <p><strong>{current.role}.</strong> {current.explanation}</p>
        <p class="tones">
          Chord tones <b>{notes(current.facts?.notes ?? [])}</b>
          {#if current.guideTones.length} · guide tones <b>{notes(current.guideTones)}</b>{/if}
        </p>
        <h3>Scales</h3>
        <ul class="scales">
          {#each current.scales as s, k (s.name)}
            <li>
              <button class:on={playing === `scale-${selected}-${k}`} onclick={() => play(`scale-${selected}-${k}`, scalePlayback(s, current.symbol), { tempo: 100 })} aria-label={`Play ${scaleTitle(s)}`}>
                {playing === `scale-${selected}-${k}` ? '■' : '▶'}
              </button>
              <div>
                <span class="sname">{scaleTitle(s)}</span>
                <span class="snotes">{notes(s.notes)}</span>
                <span class="why">{s.why}</span>
              </div>
            </li>
          {/each}
        </ul>
      </div>
    </aside>
  {/if}
{/if}

<style>
  nav { font-size: var(--step--1); margin-bottom: 1rem; }
  nav a { color: var(--dim); text-decoration: none; padding: 0.4rem 0; display: inline-block; }
  nav a::before { content: '‹ '; }

  header { display: grid; grid-template-columns: 1fr auto; align-items: start; gap: 0 1rem; margin-bottom: 0.75rem; }
  h1 {
    font-family: var(--font-display);
    font-stretch: condensed;
    font-weight: 700;
    font-size: var(--step-2);
    line-height: 1.1;
    margin: 0;
  }
  .meta { grid-column: 1; margin: 0.2rem 0 0; color: var(--dim); font-size: var(--step--1); }
  .edit { grid-column: 2; grid-row: 1; color: var(--dim); font-size: var(--step--1); padding: 0.5rem 0 0.5rem 0.5rem; text-decoration: none; }
  .lede { color: var(--dim); }

  .overview { border: 1px solid var(--navy-line); border-radius: 0.6rem; padding: 0.7rem 0.9rem; margin-bottom: 0.9rem; font-size: var(--step--1); }
  .form { margin: 0 0 0.3rem; color: var(--brass); font-weight: 600; }
  .overview ul { margin: 0; padding-left: 1.1rem; color: var(--lamp); }
  .overview li { margin: 0.15rem 0; }

  .transport { display: grid; grid-template-columns: 1fr auto; gap: 0.5rem; margin-bottom: 0.6rem; }
  .play {
    min-height: 3rem;
    border: none;
    border-radius: 0.6rem;
    background: var(--brass);
    color: var(--navy);
    font-weight: 600;
  }
  .play.on { background: var(--brass-deep); }
  .tempo { display: flex; align-items: center; gap: 0.3rem; color: var(--dim); font-size: var(--step--1); }
  select {
    min-height: 3rem;
    font: inherit;
    color: var(--lamp);
    background: var(--navy-raised);
    border: 1px solid var(--navy-line);
    border-radius: 0.6rem;
    padding: 0 0.5rem;
  }

  .hint { color: var(--dim); font-size: 0.8rem; margin: 0 0 0.8rem; }
  .legend { white-space: nowrap; }
  .bracket-demo { display: inline-block; width: 1.4rem; height: 0.45rem; border: 2px solid var(--brass-deep); border-top: none; vertical-align: middle; margin-right: 0.15rem; }

  .chart-section { margin-bottom: 0.9rem; }
  .label {
    display: inline-block;
    margin: 0 0 0.3rem;
    padding: 0 0.45rem;
    border: 1.5px solid var(--brass);
    border-radius: 0.3rem;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: var(--step--1);
    color: var(--brass);
  }
  .bars { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-left: 1px solid var(--navy-line); }
  .bar {
    position: relative;
    display: flex;
    min-height: 4.1rem;
    border-right: 1px solid var(--navy-line);
    border-bottom: 1px solid var(--navy-line);
    padding: 0.85rem 0.1rem 0.45rem;
  }
  .num { position: absolute; top: 0.1rem; left: 0.25rem; font-size: 0.6rem; color: var(--navy-line); }
  .comment { position: absolute; bottom: -0.1rem; right: 0.2rem; font-size: 0.55rem; color: var(--dim); }
  .chord {
    position: relative;
    flex: 1 1 0;
    min-width: 0;
    min-height: 2.75rem;
    display: grid;
    align-content: center;
    justify-items: start;
    gap: 0.05rem;
    padding: 0.1rem 0.2rem 0.35rem;
    border: 1px solid transparent;
    border-radius: 0.35rem;
    background: none;
    text-align: left;
  }
  .chord:disabled { color: var(--dim); cursor: default; }
  .chord.sel { border-color: var(--brass); background: color-mix(in srgb, var(--brass) 12%, transparent); }
  .sym {
    font-family: var(--font-display);
    font-stretch: condensed;
    font-weight: 600;
    font-size: 0.95rem;
    line-height: 1.1;
    max-width: 100%;
    overflow-wrap: anywhere;
  }
  .busy .sym { font-size: 0.8rem; }
  .roman { font-size: 0.66rem; color: var(--dim); white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
  .busy .roman { font-size: 0.6rem; }
  .keytag {
    position: absolute;
    top: -0.75rem;
    left: 0.2rem;
    font-size: 0.6rem;
    font-weight: 700;
    color: var(--navy);
    background: var(--brass);
    border-radius: 0.2rem;
    padding: 0 0.2rem;
    line-height: 1.3;
  }
  /* ii–V bracket under the two chords, as on a marked-up lead sheet. */
  .chord.ii::after, .chord.v::after {
    content: '';
    position: absolute;
    bottom: 0.08rem;
    height: 0.3rem;
    border-bottom: 2px solid var(--brass-deep);
  }
  .chord.ii::after { left: 0.2rem; right: -0.15rem; border-left: 2px solid var(--brass-deep); }
  .chord.v::after { left: -0.15rem; right: 0.2rem; border-right: 2px solid var(--brass-deep); }

  .patterns h2, .detail h3 {
    font-family: var(--font-display);
    font-stretch: condensed;
    font-weight: 600;
    font-size: var(--step-1);
    margin: 1.2rem 0 0.4rem;
  }
  .patterns ul { list-style: none; padding: 0; margin: 0; border-top: 1px solid var(--navy-line); }
  .patterns li { border-bottom: 1px solid var(--navy-line); }
  .patterns button {
    display: grid;
    grid-template-columns: 4rem 1fr;
    gap: 0.5rem;
    width: 100%;
    min-height: 2.9rem;
    align-items: center;
    padding: 0.35rem 0.25rem;
    border: none;
    background: none;
    text-align: left;
    font-size: var(--step--1);
  }
  .bar-no { color: var(--dim); }

  .note { color: var(--dim); font-size: 0.8rem; margin-top: 1.2rem; }

  .spacer { height: 55vh; }
  .detail {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 55vh;
    display: flex;
    flex-direction: column;
    background: var(--navy-raised);
    border-top: 2px solid var(--brass-deep);
    border-radius: 0.9rem 0.9rem 0 0;
    box-shadow: 0 -0.5rem 1.5rem rgb(0 0 0 / 0.4);
    padding-bottom: env(safe-area-inset-bottom);
    z-index: 10;
  }
  .detail-head, .detail-body { width: 100%; max-width: 34rem; margin: 0 auto; }
  .detail-head { display: grid; grid-template-columns: 2.9rem 1fr 2.9rem 2.9rem; align-items: center; padding: 0.4rem 0.6rem 0; }
  .detail-title { display: grid; justify-items: center; text-align: center; }
  .big { font-family: var(--font-display); font-stretch: condensed; font-weight: 700; font-size: var(--step-2); line-height: 1.1; color: var(--brass); }
  .in { font-size: var(--step--1); color: var(--dim); }
  .nav-btn, .close { min-height: 2.9rem; border: none; background: none; font-size: 1.6rem; color: var(--dim); }
  .detail-body { overflow-y: auto; padding: 0.3rem 1rem 1rem; font-size: var(--step--1); }
  .detail-body p { margin: 0.4rem 0; }
  .tones { color: var(--dim); }
  .tones b { color: var(--lamp); font-weight: 600; }
  .detail h3 { font-size: var(--step-0); margin: 0.7rem 0 0.2rem; }
  .scales { list-style: none; margin: 0; padding: 0; }
  .scales li { display: grid; grid-template-columns: 2.9rem 1fr; gap: 0.6rem; align-items: start; padding: 0.35rem 0; border-top: 1px solid var(--navy-line); }
  .scales button {
    width: 2.9rem;
    height: 2.9rem;
    border-radius: 50%;
    border: 1px solid var(--brass-deep);
    background: none;
    color: var(--brass);
  }
  .scales button.on { background: var(--brass); color: var(--navy); }
  .sname { display: block; font-weight: 600; }
  .snotes { display: block; color: var(--brass); letter-spacing: 0.02em; }
  .why { display: block; color: var(--dim); font-size: 0.8rem; }
</style>
