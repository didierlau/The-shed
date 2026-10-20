<script lang="ts">
  import { Note } from 'tonal';
  import { adjustRange, RANGE_PRESETS, rangeLabel, type NoteRange } from '../core/settings';
  import { loadSettings, saveSettings } from '../storage/settings';
  import { player } from '../audio/player';

  let settings = $state(loadSettings());

  const lowName = $derived(Note.fromMidi(settings.range.low));
  const highName = $derived(Note.fromMidi(settings.range.high));

  function setRange(range: NoteRange) {
    settings.range = range;
    saveSettings($state.snapshot(settings));
  }

  function step(end: 'low' | 'high', semitones: number) {
    const next = adjustRange(settings.range, end, semitones);
    setRange(next);
    // Let the user hear where the edge now is.
    void player.play([{ notes: [Note.fromMidi(next[end])], beats: 1 }]);
  }

  const isPreset = (r: NoteRange) => r.low === settings.range.low && r.high === settings.range.high;
</script>

<nav><a href="#/">The Shed</a></nav>

<h1>Settings</h1>

<h2>Note range</h2>
<p class="lede">
  Where intervals, chord qualities and scale degrees are played. Progressions, chord functions and voicings stay in
  their usual comping register.
</p>

<div class="segments" role="group" aria-label="Range presets">
  {#each RANGE_PRESETS as preset (preset.label)}
    <button class="segment" class:on={isPreset(preset.range)} aria-pressed={isPreset(preset.range)} onclick={() => setRange({ ...preset.range })}>
      {preset.label}
    </button>
  {/each}
</div>

<div class="ends">
  {#each [{ end: 'low', label: 'Lowest note', name: lowName }, { end: 'high', label: 'Highest note', name: highName }] as row (row.end)}
    {@const end = row.end as 'low' | 'high'}
    <div class="end">
      <span class="label">{row.label}</span>
      <div class="stepper">
        <button onclick={() => step(end, -12)} aria-label={`${row.label} down an octave`}>−8va</button>
        <button onclick={() => step(end, -1)} aria-label={`${row.label} down a semitone`}>−</button>
        <output>{row.name}</output>
        <button onclick={() => step(end, 1)} aria-label={`${row.label} up a semitone`}>+</button>
        <button onclick={() => step(end, 12)} aria-label={`${row.label} up an octave`}>+8va</button>
      </div>
    </div>
  {/each}
</div>

<p class="note">Current range: {rangeLabel(settings.range)}. It always spans at least two octaves.</p>

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
    margin: 0 0 1.25rem;
  }
  h2 {
    font-family: var(--font-display);
    font-stretch: condensed;
    font-weight: 600;
    font-size: var(--step-1);
    margin: 0 0 0.3rem;
  }
  .lede { margin: 0 0 1rem; color: var(--dim); font-size: var(--step--1); }

  .segments { display: flex; gap: 0.5rem; }
  .segment {
    flex: 1;
    min-height: 2.9rem;
    border-radius: 0.6rem;
    border: 1px solid var(--navy-line);
    background: var(--navy-raised);
    color: var(--dim);
  }
  .segment.on {
    border-color: var(--brass);
    color: var(--lamp);
    background: color-mix(in srgb, var(--brass) 14%, var(--navy-raised));
  }

  .ends { margin-top: 1.25rem; display: grid; gap: 0.75rem; }
  .end { display: grid; gap: 0.35rem; }
  .label { color: var(--dim); font-size: var(--step--1); }

  .stepper {
    display: grid;
    grid-template-columns: 1fr 1fr 1.4fr 1fr 1fr;
    gap: 0.35rem;
    align-items: stretch;
  }
  .stepper button {
    min-height: 2.9rem;
    border-radius: 0.6rem;
    border: 1px solid var(--navy-line);
    background: var(--navy-raised);
    font-size: var(--step--1);
  }
  .stepper button:active { border-color: var(--brass); }
  output {
    display: grid;
    place-items: center;
    font-family: var(--font-display);
    font-stretch: condensed;
    font-weight: 700;
    font-size: var(--step-1);
    color: var(--brass);
  }

  .note { margin-top: 1rem; color: var(--dim); font-size: var(--step--1); }
</style>
