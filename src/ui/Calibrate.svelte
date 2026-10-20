<script lang="ts">
  import { Note } from 'tonal';
  import { CALIBRATION_RANGES, CalibrationSession, type CalibrationRange } from '../core/listen/calibration';
  import { measureCents, spectrumToSemitones, type SemitoneVector } from '../core/listen/semitones';
  import { SETTLE_MS, StrikeWatcher } from '../core/listen/strikes';
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
  let position = $state(0);
  let recorded = $state(0);
  let skippedKeys = $state<number[]>([]);
  let level = $state(0);
  let quietFor = $state(0);

  let session: CalibrationSession | null = null;
  let mic: MicSession | null = null;

  const name = (m: number) => Note.fromMidi(m).replace('b', '♭');

  function sync() {
    const s = session!;
    expected = s.expected;
    total = s.total;
    position = s.position;
    recorded = s.done;
    skippedKeys = s.skipped;
    done = Array.from({ length: s.position }, (_, i) => s.low + i).filter((m) => !s.skipped.includes(m));
  }

  async function start() {
    error = '';
    feedback = '';
    const r = CALIBRATION_RANGES[range];
    session = new CalibrationSession(r.low, r.high);
    sync();
    // Each key is checked early (high notes fade fast), then its sound is recorded at the
    // same moment after the strike that chords are read later, so the two match.
    const watcher = new StrikeWatcher(0, SETTLE_MS.key);
    let pending: { at: number; before: SemitoneVector; cents: number | null; target: number } | null = null;
    let lastStrike = performance.now();
    try {
      mic = await startMic((frame) => {
        level = Math.min(1, frame.rms * 8);
        const s = session;
        if (!s) return;

        if (pending && frame.time >= pending.at) {
          if (s.expected === pending.target) {
            s.record(spectrumToSemitones(frame.db, frame.sampleRate), pending.before, pending.cents);
            lit = [pending.target];
            sync();
            if (s.expected === null) finish();
          }
          pending = null;
        }

        const strike = watcher.push(frame);
        if (strike) lastStrike = frame.time;
        quietFor = frame.time - lastStrike;
        if (!strike || pending || s.expected === null) return;

        const target = s.expected;
        const result = s.check(strike.after, strike.before);
        if (result.accepted) {
          feedback = '';
          const cents = measureCents(strike.frame.db, frame.sampleRate, target);
          pending = { at: strike.time + SETTLE_MS.chord, before: strike.before, cents, target };
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
    if (!session || session.done === 0) {
      phase = 'ready';
      return;
    }
    sync();
    const cal = session.result(new Date().toISOString());
    tuning = cal.tuningCents;
    if (!saveCalibration(cal)) error = "Couldn't save the calibration on this device.";
    phase = 'finished';
  }

  function undo() {
    session?.undo();
    feedback = '';
    sync();
  }

  function skip() {
    session?.skip();
    feedback = '';
    sync();
    if (session?.expected === null) finish();
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
    <div class="progress" aria-label={`${position} of ${total} keys`}>
      <span style:width={`${(position / total) * 100}%`}></span>
    </div>
    <div class="count">{position} of {total}{skippedKeys.length ? ` · ${skippedKeys.length} skipped` : ''}</div>
    <span class="meter" aria-hidden="true"><span style:width={`${Math.round(level * 100)}%`}></span></span>
    <p class="feedback">
      {#if feedback}
        {feedback}
      {:else if quietFor > 4000}
        <span class="quiet">Not hearing a key. Play a bit louder or bring the phone closer, or skip this one.</span>
      {/if}
    </p>
  </div>

  <Keyboard notes={lit} target={expected} {done} />

  <div class="actions">
    <button class="secondary" onclick={skip}>Skip this key</button>
    <button class="secondary" onclick={undo} disabled={position === 0}>Undo</button>
  </div>
  <div class="actions">
    <button class="secondary" onclick={finish} disabled={recorded === 0}>Finish here</button>
    <button class="secondary" onclick={cancel}>Cancel</button>
  </div>
{:else}
  <div class="stage">
    <div class="key">Done</div>
    <p class="lede">
      {recorded} keys recorded{skippedKeys.length ? `, ${skippedKeys.length} skipped (neighbouring keys stand in for them)` : ''}.
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
  .feedback { min-height: 3em; margin: 0.5rem 0 0; color: var(--wrong); }
  .feedback .quiet { color: var(--dim); }
  .meter { display: block; height: 4px; margin: 0.75rem auto 0; max-width: 12rem; border-radius: 2px; background: var(--navy-raised); overflow: hidden; }
  .meter span { display: block; height: 100%; background: var(--brass); transition: width 0.05s linear; }

  .actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
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
