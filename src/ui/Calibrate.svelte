<script lang="ts">
  import { Note } from 'tonal';
  import { CALIBRATION_RANGES, CalibrationSession, type CalibrationRange } from '../core/listen/calibration';
  import { measureCents } from '../core/listen/semitones';
  import { StrikeWatcher } from '../core/listen/strikes';
  import { micSupported, startMic, type MicSession } from '../input/mic';
  import { saveCalibration } from '../storage/calibration';
  import Keyboard from './Keyboard.svelte';

  type Phase = 'ready' | 'running' | 'finished';

  let range = $state<CalibrationRange>('quick');
  let phase = $state<Phase>('ready');
  let error = $state('');
  let feedback = $state('');
  let expected = $state<number | null>(null);
  let done = $state<number[]>([]);
  let total = $state(0);
  let tuning = $state(0);
  let lit = $state<number[]>([]);

  let session: CalibrationSession | null = null;
  let mic: MicSession | null = null;

  const name = (m: number) => Note.fromMidi(m).replace('b', '♭');

  function sync() {
    expected = session!.expected;
    total = session!.total;
    done = Array.from({ length: session!.done }, (_, i) => session!.low + i);
  }

  async function start() {
    error = '';
    feedback = '';
    const r = CALIBRATION_RANGES[range];
    session = new CalibrationSession(r.low, r.high);
    sync();
    const watcher = new StrikeWatcher(0, 250);
    try {
      mic = await startMic((frame) => {
        const strike = watcher.push(frame);
        if (!strike || !session || session.expected === null) return;
        const target = session.expected;
        const result = session.offer(strike.after, strike.before, measureCents(strike.frame.db, frame.sampleRate, target));
        if (result.accepted) {
          lit = [target];
          feedback = '';
          sync();
          if (session.expected === null) finish();
        } else {
          feedback =
            result.heard !== null && result.heard !== target
              ? `That sounded like ${name(result.heard)}. Play ${name(target)}.`
              : `Didn't catch that clearly. Play ${name(target)} again.`;
        }
      });
      phase = 'running';
    } catch (e) {
      console.warn(e);
      error = 'The microphone was blocked. Allow microphone access for this site, then try again.';
    }
  }

  function finish() {
    mic?.stop();
    mic = null;
    const cal = session!.result(new Date().toISOString());
    tuning = cal.tuningCents;
    if (!saveCalibration(cal)) error = "Couldn't save the calibration on this device.";
    phase = 'finished';
  }

  function undo() {
    session?.undo();
    feedback = '';
    sync();
  }

  function cancel() {
    mic?.stop();
    mic = null;
    phase = 'ready';
  }

  $effect(() => () => mic?.stop());
</script>

<nav><a href="#/listen">Listen</a></nav>

<h1>Teach the app your piano</h1>

{#if phase === 'ready'}
  <p class="lede">
    Play each key once, from low to high, at an easy pace. The app moves on by itself as soon as it hears the right key.
    Put the phone where it will be when you practise, in a quiet room.
  </p>

  <div class="segments" role="group" aria-label="Range">
    {#each Object.entries(CALIBRATION_RANGES) as [id, r] (id)}
      <button class="segment" class:on={range === id} aria-pressed={range === id} onclick={() => (range = id as CalibrationRange)}>
        <span>{r.label}</span>
        <span class="detail">{r.detail}</span>
      </button>
    {/each}
  </div>
  <p class="hint">Quick is enough for chords around the middle. Choose Full if your left hand plays low bass notes.</p>

  {#if error}<p class="error">{error}</p>{/if}

  <button class="primary" onclick={start} disabled={!micSupported()}>Start</button>
{:else if phase === 'running'}
  <div class="stage" aria-live="polite">
    <div class="label">Play</div>
    <div class="key">{expected !== null ? name(expected) : ''}</div>
    <div class="progress" aria-label={`${done.length} of ${total} keys`}>
      <span style:width={`${(done.length / total) * 100}%`}></span>
    </div>
    <div class="count">{done.length} of {total}</div>
    <p class="feedback">{feedback}</p>
  </div>

  <Keyboard notes={lit} target={expected} {done} />

  <div class="actions">
    <button class="secondary" onclick={undo} disabled={done.length === 0}>Undo last key</button>
    <button class="secondary" onclick={cancel}>Cancel</button>
  </div>
{:else}
  <div class="stage">
    <div class="key">Done</div>
    <p class="lede">
      {total} keys recorded.
      {#if Math.abs(tuning) <= 3}
        Your piano is right at A440.
      {:else}
        Your piano is {Math.abs(tuning)} cents {tuning < 0 ? 'flat' : 'sharp'}; the app now allows for that.
      {/if}
    </p>
    {#if error}<p class="error">{error}</p>{/if}
  </div>
  <a class="primary as-link" href="#/listen">Start listening</a>
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
  .lede { margin: 0 0 1.25rem; color: var(--dim); }
  .hint { color: var(--dim); font-size: var(--step--1); margin: 0.6rem 0 0; }
  .error { color: var(--wrong); }

  .segments { display: flex; gap: 0.5rem; }
  .segment {
    flex: 1;
    min-height: 3.4rem;
    display: grid;
    place-content: center;
    gap: 0.1rem;
    border-radius: 0.6rem;
    border: 1px solid var(--navy-line);
    background: var(--navy-raised);
    color: var(--dim);
  }
  .segment .detail { font-size: var(--step--1); }
  .segment.on { border-color: var(--brass); color: var(--lamp); background: color-mix(in srgb, var(--brass) 14%, var(--navy-raised)); }

  .stage { text-align: center; padding: 1rem 0 1.25rem; }
  .label { color: var(--dim); }
  .key {
    font-family: var(--font-display);
    font-stretch: condensed;
    font-weight: 700;
    font-size: 4.5rem;
    line-height: 1;
    color: var(--brass);
  }
  .progress { height: 6px; border-radius: 3px; background: var(--navy-raised); margin: 1rem 0 0.4rem; overflow: hidden; }
  .progress span { display: block; height: 100%; background: var(--brass); transition: width 0.15s ease; }
  .count { color: var(--dim); font-size: var(--step--1); font-variant-numeric: tabular-nums; }
  .feedback { min-height: 1.5em; margin: 0.5rem 0 0; color: var(--wrong); }

  .actions { display: flex; gap: 0.5rem; margin-top: 1.25rem; }
  .secondary {
    flex: 1;
    min-height: 2.9rem;
    border-radius: 0.6rem;
    border: 1px solid var(--navy-line);
    background: var(--navy-raised);
  }
  .secondary:disabled { opacity: 0.4; cursor: default; }

  .primary {
    display: block;
    width: 100%;
    min-height: 3.25rem;
    margin-top: 1.5rem;
    border: 0;
    border-radius: 0.6rem;
    background: var(--brass);
    color: var(--navy);
    font-weight: 700;
  }
  .as-link { display: grid; place-items: center; text-decoration: none; }
</style>
