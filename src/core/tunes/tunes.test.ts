import { describe, expect, it } from 'vitest';
import { analyseChart, chartToText, displayChord, normaliseChord, parseIRealPro, parseKey, parseTypedChart, type Chart } from '.';
import { distributeBeats, unscramble } from './ireal';
import { IREAL_TUNES } from './fixtures.test-data';

const tune = (title: keyof typeof IREAL_TUNES): Chart => parseIRealPro(IREAL_TUNES[title])[0]!;
const symbols = (c: Chart) => c.bars.map((b) => b.chords.map((x) => x.symbol).join(' '));
const typed = (text: string, key?: string) => parseTypedChart(text, key ? { key } : {}).chart;

describe('chord symbols', () => {
  it('reads iReal Pro and Real Book shorthand', () => {
    expect(normaliseChord('C-7')).toBe('Cm7');
    expect(normaliseChord('F^7')).toBe('Fmaj7');
    expect(normaliseChord('Bb^')).toBe('Bbmaj7');
    expect(normaliseChord('Bh7')).toBe('Bm7b5');
    expect(normaliseChord('Bh')).toBe('Bm7b5');
    expect(normaliseChord('Bø7')).toBe('Bm7b5');
    expect(normaliseChord('C#o7')).toBe('C#dim7');
    expect(normaliseChord('C°')).toBe('Cdim');
    expect(normaliseChord('Eb-^7')).toBe('EbmMaj7');
    expect(normaliseChord('CΔ7')).toBe('Cmaj7');
    expect(normaliseChord('G7sus')).toBe('G7sus4');
    expect(normaliseChord('G+7')).toBe('G7#5');
    expect(normaliseChord('Dm7/G')).toBe('Dm7/G');
    expect(normaliseChord('Cmi7')).toBe('Cm7');
    expect(normaliseChord('E7#9#11b13')).toMatch(/^E7#9/);
    expect(normaliseChord('hello')).toBeNull();
  });

  it('prints chords the way a chart does', () => {
    expect(displayChord('Ebmaj7')).toBe('E♭maj7');
    expect(displayChord('Fm7b5')).toBe('Fm7♭5');
    expect(displayChord('Bdim7')).toBe('B°7');
    expect(displayChord('Bb7/D')).toBe('B♭7/D');
  });

  it('reads keys', () => {
    expect(parseKey('Eb')).toEqual({ tonic: 'Eb', mode: 'major' });
    expect(parseKey('G-')).toEqual({ tonic: 'G', mode: 'minor' });
    expect(parseKey('f# minor')).toEqual({ tonic: 'F#', mode: 'minor' });
    expect(parseKey('H')).toBeUndefined();
  });
});

describe('iReal Pro import', () => {
  it('unscrambles 50-character blocks and leaves a short tail alone', () => {
    const block = Array.from({ length: 50 }, (_, i) => String.fromCharCode(65 + (i % 26))).join('');
    expect(unscramble(block)).toBe(block);
    const twice = unscramble(unscramble(block + block + 'xx').slice(0, 100) + 'xx');
    expect(twice).toBe(block + block + 'xx');
  });

  it('reads title, composer, key, sections and changes', () => {
    const c = tune('All The Things You Are');
    expect(c.title).toBe('All The Things You Are');
    expect(c.composer).toBe('Jerome Kern');
    expect(c.key).toEqual({ tonic: 'Ab', mode: 'major' });
    expect(c.bars).toHaveLength(36);
    expect(symbols(c).slice(0, 8)).toEqual(['Fm7', 'Bbm7', 'Eb7', 'Abmaj7', 'Dbmaj7', 'Dm7 G7', 'Cmaj7', 'Cmaj7']);
    expect(c.bars.filter((b) => b.section).map((b) => b.section)).toEqual(['A', 'B', 'C', 'D']);
    expect(c.bars[5]!.chords.map((x) => x.beats)).toEqual([2, 2]);
  });

  it('plays out repeats with first and second endings', () => {
    const c = tune('Autumn Leaves');
    expect(c.bars).toHaveLength(32);
    expect(c.bars.filter((b) => b.section).map((b) => b.section)).toEqual(['A', 'A', 'B', 'C']);
    expect(symbols(c).slice(8, 16)).toEqual(symbols(c).slice(0, 8));
  });

  it('reads every tune of a playlist', () => {
    const playlist = 'irealb://' + Object.values(IREAL_TUNES).map((l) => l.replace('irealb://', '')).join(encodeURIComponent('===')) + encodeURIComponent('===Mix');
    expect(parseIRealPro(`<a href="${playlist}">Mix</a>`)).toHaveLength(Object.keys(IREAL_TUNES).length);
  });

  it('shares a bar between its chords', () => {
    expect(distributeBeats([1], 4)).toEqual([4]);
    expect(distributeBeats([2, 2], 4)).toEqual([2, 2]);
    expect(distributeBeats([1, 1], 4)).toEqual([2, 2]);
    expect(distributeBeats([3, 1], 4)).toEqual([3, 1]);
    expect(distributeBeats([1, 1, 1], 4).reduce((a, b) => a + b)).toBe(4);
    expect(distributeBeats([1, 1], 3).reduce((a, b) => a + b)).toBe(3);
  });
});

describe('typed changes', () => {
  it('reads bars, sections, repeats, slashes and key', () => {
    const { chart, unknown } = parseTypedChart('Key: Bb\nA: Bbmaj7 G7 | C-7 F7 | % |\n[B] D7 / / G7 | Cm7 F7 |', { title: 'Test' });
    expect(chart.key).toEqual({ tonic: 'Bb', mode: 'major' });
    expect(symbols(chart)).toEqual(['Bbmaj7 G7', 'Cm7 F7', 'Cm7 F7', 'D7 G7', 'Cm7 F7']);
    expect(chart.bars[3]!.chords.map((c) => c.beats)).toEqual([3, 1]);
    expect(chart.bars.map((b) => b.section ?? '')).toEqual(['A', '', '', 'B', '']);
    expect(unknown).toEqual([]);
  });

  it('reports words it cannot read', () => {
    expect(parseTypedChart('Cmaj7 | Hm7 |').unknown).toEqual(['Hm7']);
  });

  it('writes a chart back out as text that reads the same', () => {
    const c = tune('Autumn Leaves');
    const again = parseTypedChart(chartToText(c)).chart;
    expect(symbols(again)).toEqual(symbols(c));
    expect(again.key).toEqual(c.key);
    expect(again.bars.map((b) => b.chords.map((x) => x.beats))).toEqual(c.bars.map((b) => b.chords.map((x) => x.beats)));
  });
});

describe('analysis', () => {
  const at = (a: ReturnType<typeof analyseChart>, symbol: string, nth = 0) => a.chords.filter((c) => c.symbol === symbol)[nth]!;

  it('marks a ii–V–I with Roman numerals, bracket and arrow', () => {
    const a = analyseChart(typed('Dm7 | G7 | Cmaj7 | Cmaj7 |', 'C'));
    expect(a.chords.map((c) => c.roman)).toEqual(['ii7', 'V7', 'Imaj7', 'Imaj7']);
    expect(a.chords.map((c) => c.pair)).toEqual(['ii', 'V', undefined, undefined]);
    expect(a.chords[1]!.resolves).toBe('fifth');
    expect(a.patterns.map((p) => p.label)).toContain('ii–V–I in C major');
    expect(at(a, 'Dm7').scales[0]!.name).toBe('dorian');
    expect(at(a, 'G7').scales[0]!.name).toBe('mixolydian');
    expect(at(a, 'Cmaj7').scales[0]!.name).toBe('major');
    expect(at(a, 'G7').guideTones).toEqual(['B', 'F']);
  });

  it('follows the key centres of All The Things You Are', () => {
    const a = analyseChart(tune('All The Things You Are'));
    const keyAt = (bar: number) => a.chords.find((c) => c.bar === bar - 1)!.key;
    expect(keyAt(1)).toEqual({ tonic: 'Ab', mode: 'major' });
    expect(keyAt(7)).toEqual({ tonic: 'C', mode: 'major' });
    expect(keyAt(12)).toEqual({ tonic: 'Eb', mode: 'major' });
    expect(keyAt(15)).toEqual({ tonic: 'G', mode: 'major' });
    expect(keyAt(23)).toEqual({ tonic: 'E', mode: 'major' });
    expect(keyAt(28)).toEqual({ tonic: 'Ab', mode: 'major' });
    expect(at(a, 'C7b13').roman).toBe('V7/vi');
    expect(at(a, 'DbmMaj7').role).toBe('Borrowed iv');
    expect(at(a, 'Bdim7').role).toBe('Passing diminished');
    expect(a.formSummary).toBe('A B C D form, 36 bars (8+8+8+12)');
  });

  it('hears Autumn Leaves move between B♭ major and G minor', () => {
    const a = analyseChart(tune('Autumn Leaves'));
    expect(a.patterns.slice(0, 2).map((p) => p.label)).toEqual(['ii–V–I in B♭ major', 'iiø–V–i in G minor']);
    expect(at(a, 'D7b13').scales[0]!.name).toBe('phrygian dominant');
    expect(at(a, 'Am7b5').scales[0]!.name).toBe('locrian #2');
    expect(at(a, 'Gb7').role).toBe('Tritone substitute');
    expect(at(a, 'Gb7').resolves).toBe('half-step');
  });

  it('finds the three tonal centres of Giant Steps', () => {
    const a = analyseChart(tune('Giant Steps'));
    const centres = new Set(a.keyAreas.map((k) => k.key.tonic));
    expect(centres).toEqual(new Set(['B', 'G', 'Eb']));
    expect(a.chords[0]!.key.tonic).toBe('B');
  });

  it('labels secondary dominants and the rhythm-changes bridge', () => {
    const a = analyseChart(tune('Oleo'));
    expect(at(a, 'G7').roman).toBe('V7/ii');
    expect(at(a, 'D7').roman).toBe('V7/vi');
    expect(at(a, 'C7').roman).toBe('V7/V');
    expect(at(a, 'Ab7').role).toBe('Backdoor dominant');
    expect(a.patterns.some((p) => p.kind === 'chain' && p.label.includes('V7/vi → V7/ii → V7/V → V7'))).toBe(true);
    expect(a.formSummary).toBe('A A B A form, 32 bars (8 bars each)');
  });

  it('spots a backdoor ii–V and a 12-bar blues', () => {
    const stella = analyseChart(tune('Stella By Starlight'));
    expect(stella.patterns.map((p) => p.label)).toContain('Backdoor to F major');
    expect(at(stella, 'Bbm7').role).toBe('Backdoor ii');
    expect(analyseChart(tune('Blues For Alice')).formSummary).toBe('12-bar blues');
    expect(analyseChart(tune('Solar')).formSummary).toBe('12 bars');
    const blues = analyseChart(typed('F7 | Bb7 | F7 | Cm7 F7 | Bb7 | Bdim7 | F7 | D7 | Gm7 | C7 | F7 D7 | Gm7 C7 |', 'F'));
    expect(blues.formSummary).toBe('12-bar blues');
    expect(blues.chords[0]!.roman).toBe('I7');
    expect(blues.chords.find((c) => c.bar === 3 && c.symbol === 'F7')!.roman).toBe('V7/IV');
    expect(blues.patterns.map((p) => p.label)).toContain('ii–V–I in F major');
  });

  it('labels Take the A Train’s II7 with Lydian dominant', () => {
    const a = analyseChart(tune('Take The A Train'));
    expect(at(a, 'D7#11').roman).toBe('II7');
    expect(at(a, 'D7#11').scales[0]!.name).toBe('lydian dominant');
  });

  it('works out the key when the chart does not give one', () => {
    expect(analyseChart(typed('Cm7 | Cm7 | Fm7 | Fm7 | Dm7b5 | G7b9 | Cm7 | Cm7 |')).homeKey).toEqual({ tonic: 'C', mode: 'minor' });
    const guessed = analyseChart(typed('Ebmaj7 | Cm7 | Fm7 | Bb7 | Ebmaj7 |'));
    expect(guessed.homeKey).toEqual({ tonic: 'Eb', mode: 'major' });
    expect(guessed.homeKeyGuessed).toBe(true);
  });

  it('copes with every tune in the test set without throwing', () => {
    for (const link of Object.values(IREAL_TUNES)) {
      const a = analyseChart(parseIRealPro(link)[0]!);
      for (const c of a.chords) {
        expect(c.roman).not.toBe('');
        expect(c.scales.length).toBeGreaterThan(0);
        for (const s of c.scales) expect(s.notes.length).toBeGreaterThan(4);
      }
    }
  });
});
