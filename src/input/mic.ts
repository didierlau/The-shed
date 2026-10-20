import type { MicFrame } from '../core/listen/strikes';

/**
 * The only code that talks to the microphone. About 33 times a second it
 * reports a frame: the short-term loudness (to catch key strikes) and a long
 * FFT (fine enough to tell low notes a semitone apart). All analysis happens
 * in core/listen.
 */

export interface MicSession {
  stop(): void;
}

export function micSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

export async function startMic(onFrame: (frame: MicFrame) => void): Promise<MicSession> {
  const stream = await navigator.mediaDevices.getUserMedia({
    // Phone voice processing is made for speech and mangles piano: turn it off.
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);

  // Long window for pitch: ~0.34 s, about 3 Hz per bin at 48 kHz.
  const spectrumAnalyser = ctx.createAnalyser();
  spectrumAnalyser.fftSize = 16384;
  spectrumAnalyser.smoothingTimeConstant = 0;
  source.connect(spectrumAnalyser);

  // Short window for loudness: ~20 ms, so attacks show up sharply.
  const levelAnalyser = ctx.createAnalyser();
  levelAnalyser.fftSize = 1024;
  source.connect(levelAnalyser);

  const wave = new Float32Array(levelAnalyser.fftSize);
  const timer = setInterval(() => {
    levelAnalyser.getFloatTimeDomainData(wave);
    let sum = 0;
    for (const v of wave) sum += v * v;
    const db = new Float32Array(spectrumAnalyser.frequencyBinCount);
    spectrumAnalyser.getFloatFrequencyData(db);
    onFrame({ time: performance.now(), rms: Math.sqrt(sum / wave.length), db, sampleRate: ctx.sampleRate });
  }, 30);

  return {
    stop() {
      clearInterval(timer);
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
    },
  };
}
