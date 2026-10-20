import { NoteSmoother, spectrumToNotes } from '../core/listen/spectrum';

/**
 * The only code that talks to the microphone. Captures audio, takes an FFT
 * about 20 times a second, and reports the notes that seem to be sounding.
 */

export interface MicSession {
  stop(): void;
}

export interface MicCallbacks {
  onNotes(notes: number[]): void;
  /** Input level, 0–1, for a level meter. */
  onLevel(level: number): void;
}

export function micSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

export async function startMic(callbacks: MicCallbacks): Promise<MicSession> {
  const stream = await navigator.mediaDevices.getUserMedia({
    // Phone voice processing is made for speech and mangles piano: turn it off.
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  // 16384 points: about 3 Hz per bin at 48 kHz, enough to separate low notes a semitone apart.
  analyser.fftSize = 16384;
  analyser.smoothingTimeConstant = 0.3;
  source.connect(analyser);

  const spectrum = new Float32Array(analyser.frequencyBinCount);
  const wave = new Float32Array(analyser.fftSize);
  const smoother = new NoteSmoother(4, 3);
  let last = '';

  const timer = setInterval(() => {
    analyser.getFloatFrequencyData(spectrum);
    analyser.getFloatTimeDomainData(wave);
    let peak = 0;
    for (const v of wave) peak = Math.max(peak, Math.abs(v));
    callbacks.onLevel(Math.min(1, peak * 2));

    const notes = smoother.push(spectrumToNotes(spectrum, ctx.sampleRate));
    const key = notes.join(',');
    if (key !== last) {
      last = key;
      callbacks.onNotes(notes);
    }
  }, 50);

  return {
    stop() {
      clearInterval(timer);
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
    },
  };
}
