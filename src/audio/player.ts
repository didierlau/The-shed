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
