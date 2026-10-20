import { describe, expect, it } from 'vitest';
import { Note } from 'tonal';
import { alternativeNames, nameChord } from './chordName';

const m = (notes: string) => notes.split(' ').map((n) => Note.midi(n)!);
const best = (notes: string) => nameChord(m(notes))[0]?.symbol;
const names = (notes: string) => nameChord(m(notes), 5).map((g) => g.symbol);

describe('nameChord', () => {
  it('names triads and 7th chords in root position', () => {
    expect(best('C3 E3 G3')).toBe('C');
    expect(best('A3 C4 E4')).toBe('Am');
    expect(best('C3 E3 G3 B3')).toBe('Cmaj7');
    expect(best('G2 B2 D3 F3')).toBe('G7');
    expect(best('D3 F3 A3 C4')).toBe('Dm7');
    expect(best('B2 D3 F3 A3')).toBe('Bm7♭5');
    expect(best('B2 D3 F3 Ab3')).toBe('Bdim7');
    expect(best('C3 Eb3 G3 B3')).toBe('Cm(maj7)');
    expect(best('G2 C3 D3 F3')).toBe('G7sus4');
  });

  it('lets the bass decide between chords with the same notes', () => {
    expect(best('D3 F3 A3 C4')).toBe('Dm7');
    expect(best('F2 A2 C3 D3')).toBe('F6');
    expect(best('A2 C3 E3 G3')).toBe('Am7');
    expect(best('C3 E3 G3 A3')).toBe('C6');
  });

  it('names jazz extensions', () => {
    expect(best('C3 E3 A3 D4')).toBe('C6/9');
    expect(best('F2 A2 E3 G3')).toBe('Fmaj9');
    expect(best('D3 F3 C4 E4')).toBe('Dm9');
    expect(best('G2 F3 B3 E4')).toBe('G13');
    expect(best('C3 E3 Bb3 D4')).toBe('C9');
    expect(best('C3 E3 Bb3 Db4')).toBe('C7♭9');
    expect(best('C3 E3 Bb3 D#4')).toBe('C7♯9');
    expect(best('G2 B2 F3 Ab3 Eb4')).toBe('G7alt');
    expect(best('C3 E3 B3 F#4')).toBe('Cmaj7♯11');
  });

  it('writes inversions as slash chords', () => {
    expect(best('E3 G3 C4')).toBe('C/E');
    expect(best('E2 G2 B2 C3')).toBe('Cmaj7/E');
  });

  it('offers the rootless reading as an alternative', () => {
    // E G Bb D on its own is Em7♭5, but it is also the classic rootless C9.
    expect(best('E3 G3 Bb3 D4')).toBe('Em7♭5');
    expect(names('E3 G3 Bb3 D4')).toContain('C9');
    // With the root in the bass, the C9 reading wins.
    expect(best('C2 E3 G3 Bb3 D4')).toBe('C9');
    expect(nameChord(m('E3 G3 Bb3 D4'), 5).find((g) => g.symbol === 'C9')?.rootless).toBe(true);
  });

  it('offers only alternatives that explain every note', () => {
    const alts = alternativeNames(nameChord(m('D3 F3 A3 C4'), 8)).map((g) => g.symbol);
    expect(alts).toContain('F6/D');
    expect(alts).not.toContain('Dm');
  });

  it('needs three different notes', () => {
    expect(nameChord([])).toEqual([]);
    expect(nameChord(m('C3 C4 G4'))).toEqual([]);
  });

  it('is the same in every key', () => {
    for (let t = 0; t < 12; t++) {
      const got = nameChord(m('D3 F3 A3 C4').map((n) => n + t))[0]!;
      expect(got.symbol.endsWith('m7')).toBe(true);
      expect(got.root).toBe((2 + t) % 12);
    }
  });
});

describe('nameChord on the voicings the app teaches', () => {
  it('names close, shell, drop-2 and rootless voicings over the root, in all twelve keys', async () => {
    const { buildVoicing } = await import('../voicings');
    const expected = {
      maj7: { close: 'maj7', shell: 'maj7', drop2: 'maj7', rootlessA: 'maj9', rootlessB: 'maj9' },
      m7: { close: 'm7', shell: 'm7', drop2: 'm7', rootlessA: 'm9', rootlessB: 'm9' },
      '7': { close: '7', shell: '7', drop2: '7', rootlessA: '9', rootlessB: '9' },
      m7b5: { close: 'm7♭5', shell: 'm7', drop2: 'm7♭5', rootlessA: 'm7♭5', rootlessB: 'm7♭5' },
    } as const;
    for (let root = 0; root < 12; root++) {
      for (const [quality, byType] of Object.entries(expected)) {
        for (const [type, suffix] of Object.entries(byType)) {
          const notes = buildVoicing(36 + root, quality as 'm7', type as 'close');
          const got = nameChord(notes)[0]!;
          expect(got.root, `${quality} ${type} on ${root}`).toBe(root);
          expect(got.symbol.slice(got.symbol.match(/^[A-G][b#]?/)![0].length), `${quality} ${type} on ${root}`).toBe(suffix);
        }
      }
    }
  });
});
