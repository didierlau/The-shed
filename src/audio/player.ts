import { Note } from 'tonal';
import { SplendidGrandPiano, type StopFn } from 'smplr';
import type { PlaybackStep } from '../core/types';

/**
 * The only place in the app that knows about audio libraries.
 * To change the instrument or the library, change this file only.
 */
export interface Player {
  /** Must be called from a user gesture (tap) the first time — browsers require it. */
  unlock(): Promise<void>;
  play(steps: PlaybackStep[], opts?: { tempo?: number }): Promise<void>;
  stop(): void;
  /** Start a note played live (e.g. from a MIDI keyboard) right now. Velocity 1–127. */
  noteOn(midi: number, velocity: number): void;
  /** Release a live note, with a short natural fade. */
  noteOff(midi: number): void;
  readonly source: 'piano' | 'synth' | 'loading';
}

/**
 * The piano samples are only downloaded for this loudness range. smplr stays
 * silent for a velocity it has no samples for, so every note is kept inside it.
 */
const LOADED_VELOCITY = { low: 70, high: 90 };
const clampVelocity = (v: number) => Math.min(LOADED_VELOCITY.high, Math.max(LOADED_VELOCITY.low, v));

type Instrument = { start(e: { note: string; time: number; duration: number; velocity?: number }): StopFn };

class WebAudioPlayer implements Player {
  private ctx: AudioContext | null = null;
  private piano: Instrument | null = null;
  private loading: Promise<void> | null = null;
  private active: { stop(): void }[] = [];
  private live = new Map<number, { stop(time?: number): void }>();
  source: 'piano' | 'synth' | 'loading' = 'loading';

  async unlock(): Promise<void> {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    if (!this.loading) this.loading = this.loadPiano(this.ctx);
  }

  private async loadPiano(ctx: AudioContext): Promise<void> {
    try {
      // Load every third note from A1 to C7 (the widest range setting) at one velocity
      // layer, to keep the download small; notes in between are pitch-shifted from the nearest sample.
      const piano = new SplendidGrandPiano(ctx, {
        notesToLoad: { notes: range(33, 96).filter((m) => m % 3 === 0), velocityRange: [LOADED_VELOCITY.low, LOADED_VELOCITY.high] },
      });
      await Promise.race([piano.ready, timeout(15000)]);
      this.piano = piano;
      this.source = 'piano';
    } catch (err) {
      console.warn('Piano samples unavailable, using built-in synth.', err);
      this.source = 'synth';
    }
  }

  async play(steps: PlaybackStep[], opts: { tempo?: number } = {}): Promise<void> {
    await this.unlock();
    // Give the piano a moment on first play; fall back to synth if it is still loading.
    await Promise.race([this.loading, wait(2500)]);
    const ctx = this.ctx!;
    this.stop();

    const beat = 60 / (opts.tempo ?? 80);
    let t = ctx.currentTime + 0.05;
    const sound = (note: string, start: number, length: number, velocity = 80) => {
      if (this.piano) {
        const stop = this.piano.start({ note, time: start, duration: length + 0.6, velocity: clampVelocity(velocity) });
        this.active.push({ stop: () => stop() });
      } else {
        this.active.push(synthNote(ctx, note, start, length));
      }
    };
    for (const step of steps) {
      const duration = step.beats * beat;
      for (const note of step.notes) sound(note, t, duration);
      // Held notes (a drone) ring on, as soft as the loaded samples allow.
      for (const note of step.held?.notes ?? []) sound(note, t, step.held!.beats * beat, LOADED_VELOCITY.low);
      t += duration;
    }
    await wait((t - ctx.currentTime) * 1000);
  }

  noteOn(midi: number, velocity: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    this.noteOff(midi);
    const note = Note.fromMidi(midi);
    if (this.piano) {
      // Only velocities 70–90 are loaded, so the keyboard's full range is scaled into that band
      // to keep some light-and-shade without ever going silent.
      const v = LOADED_VELOCITY.low + ((Math.min(127, Math.max(1, velocity)) - 1) / 126) * (LOADED_VELOCITY.high - LOADED_VELOCITY.low);
      const stop = this.piano.start({ note, time: ctx.currentTime, duration: 30, velocity: Math.round(v) });
      this.live.set(midi, { stop: () => stop() });
    } else {
      this.live.set(midi, liveSynthNote(ctx, note, velocity));
    }
  }

  noteOff(midi: number): void {
    const v = this.live.get(midi);
    if (!v) return;
    this.live.delete(midi);
    try { v.stop(); } catch { /* already stopped */ }
  }

  stop(): void {
    for (const v of this.active) {
      try { v.stop(); } catch { /* already stopped */ }
    }
    this.active = [];
  }
}

/** Soft electric-piano-ish tone used when samples can't load (offline, blocked network). */
function synthNote(ctx: AudioContext, note: string, time: number, duration: number) {
  const freq = Note.freq(note) ?? 440;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.25, time + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration + 0.8);
  gain.connect(ctx.destination);
  const oscs = [1, 2].map((mult, i) => {
    const o = ctx.createOscillator();
    o.type = i === 0 ? 'triangle' : 'sine';
    o.frequency.value = freq * mult;
    const g = ctx.createGain();
    g.gain.value = i === 0 ? 1 : 0.15;
    o.connect(g).connect(gain);
    o.start(time);
    o.stop(time + duration + 0.9);
    return o;
  });
  return { stop: () => oscs.forEach((o) => o.stop()) };
}

/** Synth fallback for live playing: sounds until released, then fades out. */
function liveSynthNote(ctx: AudioContext, note: string, velocity: number) {
  const freq = Note.freq(note) ?? 440;
  const t = ctx.currentTime;
  const peak = 0.08 + 0.2 * (Math.min(127, Math.max(1, velocity)) / 127);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(peak, t + 0.01);
  gain.gain.setTargetAtTime(peak * 0.3, t + 0.01, 1.5);
  gain.connect(ctx.destination);
  const oscs = [1, 2].map((mult, i) => {
    const o = ctx.createOscillator();
    o.type = i === 0 ? 'triangle' : 'sine';
    o.frequency.value = freq * mult;
    const g = ctx.createGain();
    g.gain.value = i === 0 ? 1 : 0.15;
    o.connect(g).connect(gain);
    o.start(t);
    return o;
  });
  return {
    stop() {
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.setTargetAtTime(0, now, 0.08);
      oscs.forEach((o) => o.stop(now + 0.6));
    },
  };
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}
function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, Math.max(0, ms)));
}
function timeout(ms: number) {
  return new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}

export const player: Player = new WebAudioPlayer();
