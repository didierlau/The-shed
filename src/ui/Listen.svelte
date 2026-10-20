<script lang="ts">
  import { ChordTracker, type ChordEvent } from '../core/listen/tracker';
  import { alternativeNames, noteNames, type ChordGuess } from '../core/listen/chordName';
  import { midiSupported, startMidi, type MidiSession } from '../input/midi';
  import { micSupported, startMic, type MicSession } from '../input/mic';
  import { buildDictionary } from '../core/listen/calibration';
  import { MicTranscriber } from '../core/listen/strikes';
  import { loadCalibration } from '../storage/calibration';
  import Keyboard from './Keyboard.svelte';

  type Source = 'midi' | 'mic';

  let source = $state<Source>(midiSupported() ? 'midi' : 'mic');
  let listening = $state(false);
  let error = $state('');
  let devices = $state<string[]>([]);
  let level = $state(0);
  let notes = $state<number[]>([]);
  let guesses = $state<ChordGuess[]>([]);
  let history = $state<ChordEvent[]>([]);
  const calibration = loadCalibration();

  let session: MidiSession | MicSession | null = null;
  let tracker = new ChordTracker(80);
  let ticker: ReturnType<typeof setInterval> | null = null;

  const best = $derived(guesses[0]);
  const others = $derived(alternativeNames(guesses));

  function track() {
    const { current, changed } = tracker.update(performance.now(), $state.snapshot(notes));
    guesses = current;
    if (changed) history = [...history.slice(-31), changed];
  }

  async function start() {
    error = '';
    stop();
    // Mic notes arrive already settled per strike, so they count straight away.
    tracker = new ChordTracker(source === 'mic' ? 0 : 80);
    try {
      if (source === 'midi') {
        session = await startMidi({
          onNotes: (n) => {
            notes = n;
            track();
          },
          onDevices: (names) => (devices = names),
        });
      } else {
        // Matches each strike against this piano's recorded notes (or a modelled piano).
        const transcriber = new MicTranscriber(buildDictionary(calibration));
        session = await startMic((frame) => {
          level = Math.min(1, frame.rms * 8);
          const n = transcriber.push(frame);
          if (n) {
            notes = n;
            track();
          }
        });
      }
      listening = true;
      ticker = setInterval(track, 40);
    } catch (e) {
      error =
        source === 'midi'
          ? 'MIDI access was blocked. Allow MIDI for this site in Chrome, then try again.'
          : 'The microphone was blocked. Allow microphone access for this site, then try again.';
      console.warn(e);
    }
  }

  function stop() {
    session?.stop();
    session = null;
    if (ticker) clearInterval(ticker);
    ticker = null;
    listening = false;
    notes = [];
    guesses = [];
    level = 0;
  }

  function choose(s: Source) {
    if (s === source) return;
    source = s;
    if (listening) void start();
  }

  $effect(() => () => stop());
</script>

<nav><a href="#/">The Shed</a></nav>

<h1>Listen</h1>
<p class="lede">Play your piano and see the chord names.</p>

<div class="segments" role="group" aria-label="Input">
  <button class="segment" class:on={source === 'midi'} aria-pressed={source === 'midi'} onclick={() => choose('midi')} disabled={!midiSupported()}>
    MIDI piano
  </button>
  <button class="segment" class:on={source === 'mic'} aria-pressed={source === 'mic'} onclick={() => choose('mic')} disabled={!micSupported()}>
    Microphone
  </button>
</div>

<p class="status">
  {#if error}
    <span class="error">{error}</span>
  {:else if source === 'midi' && !midiSupported()}
    This browser has no MIDI support. Use Chrome, or switch to the microphone.
  {:else if source === 'midi' && listening && devices.length === 0}
    No MIDI piano found. Connect it by USB (with an OTG adapter on a phone), or pair it over Bluetooth first. It appears
    here as soon as it's connected.
  {:else if source === 'midi' && listening}
    Connected: {devices.join(', ')}
  {:else if source === 'mic' && listening}
    <span class="meter" aria-hidden="true"><span style:width={`${Math.round(level * 100)}%`}></span></span>
    Each chord is read just after you strike it and held until the next one.
  {:else}
    {source === 'midi' ? 'Exact notes from a digital piano.' : 'Works with any piano.'}
  {/if}
</p>

{#if source === 'mic'}
  {#if calibration}
    <p class="calibrated">
      Tuned to your piano ({calibration.keys.length} keys, {new Date(calibration.createdAt).toLocaleDateString()}).
      <a href="#/calibrate">Recalibrate</a>
    </p>
  {:else}
    <a class="calibrate" href="#/calibrate">
      <span class="title">Teach the app your piano</span>
      <span class="desc">Play each key once, about 30 seconds. Makes mic detection far more reliable.</span>
    </a>
  {/if}
{/if}

<div class="stage" aria-live="polite">
  <div class="chord">{best ? best.symbol : listening ? '…' : '—'}</div>
  <div class="notes">{notes.length ? noteNames(notes).join(' ') : listening ? 'Play three or more notes' : ' '}</div>
  {#if others.length}
    <div class="also">
      Also: {others.map((g) => g.symbol + (g.rootless ? ' (rootless)' : '')).join(', ')}
    </div>
  {/if}
</div>

<Keyboard {notes} />

<button class="primary" onclick={() => (listening ? stop() : start())}>
  {listening ? 'Stop listening' : 'Start listening'}
</button>

{#if history.length}
  <div class="history-head">
    <h2>What you played</h2>
    <button class="link" onclick={() => (history = [])}>Clear</button>
  </div>
  <ol class="history">
    {#each history as ev (ev.time)}
      <li>{ev.symbol}</li>
    {/each}
  </ol>
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
    margin: 0 0 0.3rem;
  }
  .lede { margin: 0 0 1.25rem; color: var(--dim); }

  .segments { display: flex; gap: 0.5rem; }
  .segment {
    flex: 1;
    min-height: 2.9rem;
    border-radius: 0.6rem;
    border: 1px solid var(--navy-line);
    background: var(--navy-raised);
    color: var(--dim);
  }
  .segment.on { border-color: var(--brass); color: var(--lamp); background: color-mix(in srgb, var(--brass) 14%, var(--navy-raised)); }
  .segment:disabled { opacity: 0.4; cursor: default; }

  .calibrated { margin: 0.25rem 0 0; color: var(--dim); font-size: var(--step--1); }
  .calibrated a { color: var(--brass); display: inline-block; padding: 0.6rem 0; }
  .calibrate {
    display: grid;
    gap: 0.15rem;
    margin-top: 0.5rem;
    padding: 0.85rem 1rem;
    border: 1px solid var(--brass-deep);
    border-radius: 0.6rem;
    background: var(--navy-raised);
    color: inherit;
    text-decoration: none;
  }
  .calibrate .title { color: var(--brass); font-weight: 600; }
  .calibrate .desc { color: var(--dim); font-size: var(--step--1); }

  .status { min-height: 3em; margin: 0.75rem 0 0; color: var(--dim); font-size: var(--step--1); }
  .error { color: var(--wrong); }
  .meter {
    display: block;
    height: 4px;
    margin-bottom: 0.4rem;
    border-radius: 2px;
    background: var(--navy-raised);
    overflow: hidden;
  }
  .meter span { display: block; height: 100%; background: var(--brass); transition: width 0.05s linear; }

  .stage { text-align: center; padding: 1.25rem 0 1rem; }
  .chord {
    font-family: var(--font-display);
    font-stretch: condensed;
    font-weight: 700;
    font-size: 4rem;
    line-height: 1.05;
    color: var(--brass);
    min-height: 1.05em;
  }
  .notes { color: var(--lamp); margin-top: 0.4rem; min-height: 1.5em; font-variant-numeric: tabular-nums; }
  .also { color: var(--dim); font-size: var(--step--1); margin-top: 0.25rem; }

  .primary {
    width: 100%;
    min-height: 3.25rem;
    margin-top: 1.25rem;
    border: 0;
    border-radius: 0.6rem;
    background: var(--brass);
    color: var(--navy);
    font-weight: 700;
  }

  .history-head { display: flex; justify-content: space-between; align-items: baseline; margin-top: 2rem; }
  h2 {
    font-family: var(--font-display);
    font-stretch: condensed;
    font-weight: 600;
    font-size: var(--step-1);
    margin: 0;
  }
  .link { background: none; border: 0; color: var(--brass); min-height: 44px; padding: 0 0.25rem; }
  .history {
    list-style: none;
    margin: 0.5rem 0 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .history li {
    padding: 0.35rem 0.7rem;
    border: 1px solid var(--navy-line);
    border-radius: 0.5rem;
    background: var(--navy-raised);
    font-weight: 600;
  }
  .history li:last-child { border-color: var(--brass); }
</style>
