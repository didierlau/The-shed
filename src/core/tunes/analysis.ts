import { Note } from 'tonal';
import { displayChord, keyName, shortKeyName, type Chart, type TuneKey } from './chart';
import {
  borrowedFromMinor,
  chordFacts,
  degreeNumeral,
  diatonicRole,
  guideTones,
  isDiatonic,
  isScaleDegree,
  keyPc,
  romanFor,
  sameKey,
  scalesFor,
  semis,
  targetNumeral,
  type ChordFacts,
  type ScaleChoice,
} from './harmony';

/**
 * Harmonic analysis of a chart, the way a teacher would mark up a lead sheet:
 * key centres, Roman numerals, ii–V brackets and resolution arrows, what each
 * chord is doing, and which scales fit it.
 */

export interface AnalysedChord {
  /** Index of the bar in chart.bars. */
  bar: number;
  beats: number;
  symbol: string;
  alt?: string;
  facts: ChordFacts | null;
  /** The key this chord is heard in. */
  key: TuneKey;
  roman: string;
  role: string;
  explanation: string;
  scales: ScaleChoice[];
  guideTones: string[];
  /** Resolves to the next chord: down a fifth (solid arrow) or down a half step (tritone sub, dashed). */
  resolves?: 'fifth' | 'half-step';
  /** Part of a ii–V bracket. */
  pair?: 'ii' | 'V';
}

export type PatternKind = 'ii-V-I' | 'ii-V' | 'backdoor' | 'tritone-sub' | 'chain' | 'turnaround';

export interface Pattern {
  kind: PatternKind;
  label: string;
  /** Indices into `chords`. */
  first: number;
  last: number;
  /** 1-based bar number where it starts. */
  barNumber: number;
}

export interface KeyArea {
  key: TuneKey;
  firstBar: number;
  lastBar: number;
}

export interface FormSection {
  label: string;
  firstBar: number;
  bars: number;
}

export interface TuneAnalysis {
  homeKey: TuneKey;
  /** True when the chart didn't say its key and it was worked out from the chords. */
  homeKeyGuessed: boolean;
  chords: AnalysedChord[];
  patterns: Pattern[];
  keyAreas: KeyArea[];
  form: FormSection[];
  formSummary: string;
  highlights: string[];
}

interface Item {
  bar: number;
  beats: number;
  symbol: string;
  alt?: string;
  facts: ChordFacts | null;
}

type Cadence = { ii?: number; v: number; target: number; kind: 'fifth' | 'half-step' | 'backdoor' };

export function analyseChart(chart: Chart): TuneAnalysis {
  const items: Item[] = chart.bars.flatMap((bar, b) =>
    bar.chords.map((c) => ({ bar: b, beats: c.beats, symbol: c.symbol, ...(c.alt ? { alt: c.alt } : {}), facts: chordFacts(c.symbol) })),
  );
  const real = items.map((it, i) => (it.facts ? i : -1)).filter((i) => i >= 0);
  const pos = new Map(real.map((i, p) => [i, p]));
  const F = (i: number) => items[i]!.facts!;
  const sameChord = (a: number, b: number) => F(a).pc === F(b).pc && F(a).family === F(b).family;

  /** The next chord that is actually a change (wrapping round to the top: tunes loop). */
  const next = (i: number): number | undefined => {
    const p = pos.get(i);
    if (p === undefined) return undefined;
    for (let k = 1; k < real.length; k++) {
      const j = real[(p + k) % real.length]!;
      if (!sameChord(i, j)) return j;
    }
    return undefined;
  };
  const prev = (i: number): number | undefined => {
    const p = pos.get(i);
    if (p === undefined) return undefined;
    for (let k = 1; k < real.length; k++) {
      const j = real[(p - k + real.length * 2) % real.length]!;
      if (!sameChord(i, j)) return j;
    }
    return undefined;
  };
  /** How long a chord lasts, counting immediate repeats of it. */
  const span = (i: number): number => {
    let total = 0;
    for (let p = pos.get(i)!; p < real.length && sameChord(i, real[p]!); p++) total += items[real[p]!]!.beats;
    return total;
  };
  const isDominantLike = (f: ChordFacts) => f.family === 'dominant' || f.family === 'augmented';
  /** First chord of a run of the same chord (so "Dm7 | Dm7 | G7" counts one ii–V). */
  const isHead = (i: number) => {
    const p = pos.get(i)!;
    return p === 0 || !sameChord(real[p - 1]!, i);
  };
  /** Where a ii–V points: a fifth below the V, or a half step below a SubV. */
  const goalOf = (ii: number, v: number) =>
    displayChord(Note.simplify(semis(F(ii).pc, F(v).pc) === 5 ? Note.transpose(F(v).root, '4P') : Note.transpose(F(ii).root, '-2M')));

  const resolution = (i: number): 'fifth' | 'half-step' | undefined => {
    if (!isDominantLike(F(i))) return undefined;
    const n = next(i);
    if (n === undefined) return undefined;
    const d = semis(F(i).pc, F(n).pc);
    return d === 5 ? 'fifth' : d === 11 ? 'half-step' : undefined;
  };
  /** A minor or half-diminished chord that forms a ii–V with the chord after it. */
  const iiOf = (i: number): number | undefined => {
    const f = F(i);
    if (f.family !== 'minor' && f.family !== 'half-diminished') return undefined;
    const d = next(i);
    if (d === undefined || F(d).family !== 'dominant' || F(d).sus) return undefined;
    // ii–V (Dm7 G7), or ii–SubV (Dm7 D♭7): the SubV sits a half step below the ii.
    const gap = semis(f.pc, F(d).pc);
    return gap === 5 || (gap === 11 && resolution(d) !== 'fifth') ? d : undefined;
  };
  const isLast = (i: number) => pos.get(i) === real.length - 1 || real.slice(pos.get(i)! + 1).every((j) => sameChord(i, j));
  /** Does the music arrive here as on a tonic (rather than passing through)? */
  const isTonicArrival = (t: number): boolean => {
    const f = F(t);
    if (f.family === 'major') return true;
    if (f.family === 'dominant' && bluesTonic && f.pc === keyPc(homeKey)) return true;
    if (f.family === 'minor') return iiOf(t) === undefined && (span(t) >= chart.beatsPerBar || isLast(t));
    return false;
  };
  const keyOfTarget = (t: number): TuneKey => ({ tonic: F(t).root, mode: F(t).family === 'minor' ? 'minor' : 'major' });
  let bluesTonic = false;

  const { key: homeKey, guessed } = chart.key ? { key: chart.key, guessed: false } : { key: guessKey(items, chart.beatsPerBar), guessed: true };

  // In a blues the tonic is a dominant 7th: the tune starts on I7.
  const first = real[0];
  bluesTonic = homeKey.mode === 'major' && first !== undefined && F(first).family === 'dominant' && !F(first).sus && F(first).pc === keyPc(homeKey);

  // Cadences: V→I, SubV→I and backdoor ♭VII7→I, with the ii before them if there is one.
  const cadences: Cadence[] = [];
  for (const i of real) {
    const f = F(i);
    if (!isDominantLike(f) || !isHead(i)) continue;
    const n = next(i);
    if (n === undefined) continue;
    const res = resolution(i);
    const p = prev(i);
    if (res) {
      cadences.push({ v: i, target: n, kind: res, ...(p !== undefined && iiOf(p) === i ? { ii: p } : {}) });
    } else if (f.family === 'dominant' && semis(f.pc, F(n).pc) === 2 && F(n).family === 'major') {
      const iv = p !== undefined && F(p).family === 'minor' && semis(F(p).pc, f.pc) === 5 ? p : undefined;
      cadences.push({ v: i, target: n, kind: 'backdoor', ...(iv !== undefined ? { ii: iv } : {}) });
    }
  }
  const startOf = (c: Cadence) => c.ii ?? c.v;

  /** The key a cadence moves the music into, or null if it is only a passing tonicisation. */
  const cadenceKey = (c: Cadence, current: TuneKey): TuneKey | null => {
    if (!isTonicArrival(c.target)) return null;
    const k = keyOfTarget(c.target);
    if (sameKey(k, current) || sameKey(k, homeKey)) return k;
    const target = F(c.target);
    if (c.ii !== undefined) return k;
    if (isDiatonic(target, current)) return null;
    if (isDiatonic(target, homeKey)) return homeKey;
    return k;
  };

  /** Does this chord make sense in a key without changing key? */
  const fits = (i: number, key: TuneKey): boolean => {
    const f = F(i);
    if (isDiatonic(f, key)) return true;
    if (sameKey(key, homeKey) && borrowedFromMinor(f, key)) return true;
    const n = next(i);
    if (isDominantLike(f)) {
      if (resolution(i) && n !== undefined) return isScaleDegree(F(n).pc, key);
      if (n !== undefined && semis(f.pc, F(n).pc) === 2 && F(n).pc === keyPc(key)) return true;
    }
    const d = iiOf(i);
    if (d !== undefined) {
      const t = next(d);
      return t !== undefined && isScaleDegree(F(t).pc, key);
    }
    if (f.family === 'diminished' && n !== undefined) return [0, 1, 11].includes(semis(f.pc, F(n).pc));
    if (n !== undefined && F(n).family === f.family && [1, 11].includes(semis(f.pc, F(n).pc))) return true;
    return false;
  };

  // Walk through the tune deciding which key each chord is heard in.
  const keyAt = new Map<number, TuneKey>();
  const cadenceAt = new Map<number, Cadence>();
  for (const c of cadences) if (!cadenceAt.has(startOf(c))) cadenceAt.set(startOf(c), c);
  let current = homeKey;
  let protectUntil = -1;
  // A turnaround at the end that resolves to the first chord sets the key of the top.
  const wrap = cadences.find((c) => pos.get(c.target) === 0 && pos.get(startOf(c))! > 0 && !isDiatonic(F(c.target), homeKey));
  if (wrap) {
    const k = cadenceKey(wrap, homeKey);
    if (k) {
      current = k;
      protectUntil = 0;
    }
  }
  for (let p = 0; p < real.length; p++) {
    const i = real[p]!;
    const c = cadenceAt.get(i);
    const k = c ? cadenceKey(c, current) : null;
    if (c && k) {
      current = k;
      const tp = pos.get(c.target)!;
      protectUntil = Math.max(protectUntil, tp > p ? tp : real.length - 1);
    } else if (p > protectUntil && !fits(i, current)) {
      current = homeKey;
    }
    keyAt.set(i, current);
  }

  // Label every chord.
  const chords: AnalysedChord[] = [];
  let lastKey = keyAt.get(real[0] ?? -1) ?? homeKey;
  items.forEach((it, i) => {
    if (!it.facts) {
      chords.push({ ...base(it), key: lastKey, facts: null, roman: '', role: it.symbol === 'N.C.' ? 'No chord' : 'Unreadable chord', explanation: '', scales: [], guideTones: [] });
      return;
    }
    const key = keyAt.get(i)!;
    lastKey = key;
    const f = it.facts;
    const n = next(i);
    const res = resolution(i);
    const iiTarget = iiOf(i);
    const label = describe(i, key);
    const ctx = {
      key,
      ...(res && n !== undefined ? { resolvesTo: { facts: F(n), by: res } } : {}),
      ...(iiTarget !== undefined ? { isII: true } : {}),
      ...(iiTarget !== undefined && next(iiTarget) !== undefined && ['minor', 'half-diminished'].includes(F(next(iiTarget)!).family) ? { iiOfMinor: true } : {}),
      ...(label.role === 'Backdoor dominant' ? { backdoor: true } : {}),
    };
    const p = prev(i);
    chords.push({
      ...base(it),
      facts: f,
      key,
      ...label,
      scales: scalesFor(f, ctx),
      guideTones: guideTones(f),
      ...(res ? { resolves: res } : {}),
      ...(iiTarget !== undefined ? { pair: 'ii' as const } : p !== undefined && iiOf(p) === i ? { pair: 'V' as const } : {}),
    });
  });

  function describe(i: number, key: TuneKey): { roman: string; role: string; explanation: string } {
    const f = F(i);
    const n = next(i);
    const p = prev(i);
    const sym = (j: number) => displayChord(items[j]!.symbol);
    const tonicPc = keyPc(key);
    const res = resolution(i);

    if (bluesTonic && f.family === 'dominant' && f.pc === tonicPc && sameKey(key, homeKey) && !(p !== undefined && iiOf(p) === i))
      return { roman: 'I7', role: 'Blues tonic', explanation: 'In the blues the home chord is a dominant 7th: it sounds settled here, and it also leads to IV.' };

    if (isDominantLike(f) && n !== undefined) {
      const t = F(n);
      if (res === 'fifth' && t.pc === tonicPc)
        return { roman: f.family === 'augmented' ? 'V+' : 'V7', role: 'Dominant', explanation: `Resolves down a fifth to ${sym(n)}, the tonic of ${keyName(key)}.` };
      if (res === 'fifth' && isScaleDegree(t.pc, key) && t.pc !== tonicPc) {
        const x = targetNumeral(key, t);
        return { roman: `V7/${x}`, role: 'Secondary dominant', explanation: `The V7 of ${sym(n)}: it borrows ${x}’s own dominant to lead into it.` };
      }
      if (res === 'half-step') {
        const v = displayChord(Note.simplify(Note.transpose(f.root, '4A')) + '7');
        if (t.pc === tonicPc) return { roman: 'SubV7', role: 'Tritone substitute', explanation: `Stands in for ${v}: same 3rd and 7th, and the bass slides down a half step to the tonic.` };
        const x = isScaleDegree(t.pc, key) ? targetNumeral(key, t) : degreeNumeral(key, t.root);
        return { roman: `SubV7/${x}`, role: 'Tritone substitute', explanation: `Stands in for ${v}, the V7 of ${sym(n)}: the bass slides down a half step.` };
      }
      if (f.family === 'dominant' && semis(f.pc, t.pc) === 2 && t.pc === tonicPc && t.family === 'major')
        return { roman: romanFor(key, f), role: 'Backdoor dominant', explanation: `Resolves up a whole step to ${sym(n)}: the “backdoor” cadence, borrowed from the parallel minor.` };
    }

    const d = iiOf(i);
    if (d !== undefined) {
      const dt = next(d);
      if (dt !== undefined && semis(F(d).pc, F(dt).pc) === 2 && F(dt).pc === tonicPc && F(dt).family === 'major' && semis(f.pc, F(d).pc) === 5)
        return { roman: romanFor(key, f), role: 'Backdoor ii', explanation: `With ${sym(d)} it makes the backdoor ii–V (iv–♭VII7) into ${sym(dt)}.` };
      const dRes = resolution(d);
      const toTonic = dt !== undefined && F(dt).pc === tonicPc && dRes !== undefined;
      const dia = diatonicRole(f, key);
      if (toTonic && dia) return { roman: romanFor(key, f), role: 'Pre-dominant', explanation: `The ii of the ii–V: ${sym(i)} → ${sym(d)} → ${sym(dt!)}.` };
      if (dRes === 'fifth' && dt !== undefined && isScaleDegree(F(dt).pc, key) && F(dt).pc !== tonicPc) {
        const x = targetNumeral(key, F(dt));
        const ii = f.family === 'half-diminished' ? 'iiø7' : 'ii7';
        return { roman: `${ii}/${x}`, role: 'Related ii', explanation: `The ii of ${sym(d)}: together they make a ii–V into ${sym(dt)}.` };
      }
      const goal = goalOf(i, d);
      if (dia) return { roman: romanFor(key, f), role: dia.role, explanation: `${dia.explanation} Here it pairs with ${sym(d)} as a ii–V pointing to ${goal}.` };
      return { roman: romanFor(key, f), role: 'Related ii', explanation: `Pairs with ${sym(d)} as a ii–V pointing to ${goal}.` };
    }

    const dia = diatonicRole(f, key);
    if (dia) {
      if (isDominantLike(f) && semis(tonicPc, f.pc) === 7 && n !== undefined && !res)
        return { roman: romanFor(key, f), role: 'Dominant', explanation: `${dia.explanation} Here it moves to ${sym(n)} instead.` };
      return { roman: romanFor(key, f), ...dia };
    }

    const borrowed = borrowedFromMinor(f, key);
    if (borrowed) return { roman: romanFor(key, f), ...borrowed };

    if (f.family === 'diminished' && n !== undefined) {
      const up = semis(f.pc, F(n).pc);
      const asDominant = displayChord(Note.simplify(Note.transpose(f.root, '-3M')) + '7b9');
      if (up === 1) return { roman: romanFor(key, f), role: 'Passing diminished', explanation: `Connects ${p !== undefined ? sym(p) + ' and ' : 'to '}${sym(n)} by half step; it sounds like a rootless ${asDominant} resolving to ${sym(n)}.` };
      if (up === 11) return { roman: romanFor(key, f), role: 'Passing diminished', explanation: `Steps down by half step to ${sym(n)}, filling in the bass line.` };
      if (up === 0 || (p !== undefined && F(p).pc === f.pc)) return { roman: romanFor(key, f), role: 'Auxiliary diminished', explanation: `Decorates ${sym(up === 0 ? n : p!)}: a diminished chord over the same bass note, then back.` };
      return { roman: romanFor(key, f), role: 'Diminished', explanation: `Works like a rootless ${asDominant}.` };
    }

    if (f.family === 'dominant') {
      const s = semis(tonicPc, f.pc);
      const roman = romanFor(key, f);
      const where = n !== undefined ? ` Here it moves to ${sym(n)}.` : '';
      if (key.mode === 'major') {
        if (s === 0) return { roman, role: 'Tonic dominant', explanation: `The bluesy I7; it is also the V7 of IV.${where}` };
        if (s === 2) return { roman, role: 'Dominant on II', explanation: `II7 is the V7 of V, often followed by ii–V instead of resolving (as in Take the A Train).${where}` };
        if (s === 4) return { roman, role: 'Dominant on III', explanation: `III7 is the V7 of vi.${where}` };
        if (s === 5) return { roman, role: 'Subdominant dominant', explanation: `The bluesy IV7.${where}` };
        if (s === 8) return { roman, role: 'Dominant on ♭VI', explanation: `♭VI7 often stands in for II7 (its tritone sub) or leads back to I.${where}` };
        if (s === 9) return { roman, role: 'Dominant on VI', explanation: `VI7 is the V7 of ii.${where}` };
        if (s === 11) return { roman, role: 'Dominant on VII', explanation: `VII7 is the V7 of iii.${where}` };
        if (s === 1) return { roman, role: 'Tritone substitute', explanation: `♭II7 is the tritone sub of V7.${where}` };
      }
      return { roman, role: 'Chromatic dominant', explanation: `A dominant outside ${keyName(key)}, used for colour.${where}` };
    }

    if (n !== undefined && F(n).family === f.family && [1, 11].includes(semis(f.pc, F(n).pc)))
      return { roman: romanFor(key, f), role: 'Chromatic approach', explanation: `Slides by half step into ${sym(n)}.` };

    if (p !== undefined && n !== undefined) {
      const down = semis(f.pc, F(p).pc) === 1 && semis(F(n).pc, f.pc) === 1;
      const up = semis(F(p).pc, f.pc) === 1 && semis(f.pc, F(n).pc) === 1;
      if (down || up)
        return { roman: romanFor(key, f), role: 'Chromatic passing chord', explanation: `Part of a chromatic line: ${sym(p)} → ${sym(i)} → ${sym(n)}, the bass moving by half steps.` };
    }

    return { roman: romanFor(key, f), role: 'Outside the key', explanation: `Not in ${keyName(key)}: a colour chord.` };
  }

  const patterns = findPatterns();

  function findPatterns(): Pattern[] {
    const out: Pattern[] = [];
    const add = (kind: PatternKind, label: string, first: number, last: number) =>
      out.push({ kind, label, first, last, barNumber: items[first]!.bar + 1 });
    const inV = new Set<number>();
    for (const i of real) {
      const d = iiOf(i);
      if (d === undefined || !isHead(i) || pos.get(d)! < pos.get(i)!) continue;
      inV.add(d);
      const t = next(d);
      const res = resolution(d);
      const sub = res === 'half-step' ? 'SubV' : 'V';
      if (t !== undefined && res && isTonicArrival(t)) {
        const k = keyOfTarget(t);
        const ii = F(i).family === 'half-diminished' ? 'iiø' : 'ii';
        const tonic = k.mode === 'minor' ? 'i' : 'I';
        add('ii-V-I', `${ii}–${sub}–${tonic} in ${keyName(k)}`, i, pos.get(t)! > pos.get(d)! ? t : d);
      } else if (t !== undefined && res) {
        add('ii-V', `ii–${sub} to ${displayChord(items[t]!.symbol)}`, i, pos.get(t)! > pos.get(d)! ? t : d);
      } else if (!(t !== undefined && semis(F(d).pc, F(t).pc) === 2 && F(t).family === 'major')) {
        // (A ii–V that goes up a whole step is the backdoor, listed below.)
        add('ii-V', `ii–${sub} of ${goalOf(i, d)}, not resolved`, i, d);
      }
    }
    for (const c of cadences) {
      if (c.kind === 'backdoor' && isTonicArrival(c.target)) add('backdoor', `Backdoor to ${keyName(keyOfTarget(c.target))}`, startOf(c), pos.get(c.target)! > pos.get(c.v)! ? c.target : c.v);
      if (c.kind === 'half-step' && c.ii === undefined && !inV.has(c.v)) add('tritone-sub', `Tritone sub: ${displayChord(items[c.v]!.symbol)} → ${displayChord(items[c.target]!.symbol)}`, c.v, pos.get(c.target)! > pos.get(c.v)! ? c.target : c.v);
    }
    // Chains of dominants, each resolving down a fifth to the next.
    let run: number[] = [];
    const flush = () => {
      if (run.length >= 3) add('chain', `Chain of dominants: ${run.map((j) => chords[j]!.roman).join(' → ')}`, run[0]!, run.at(-1)!);
      run = [];
    };
    for (const i of real) {
      if (run.length > 0 && sameChord(run.at(-1)!, i)) continue;
      if (F(i).family === 'dominant' && (run.length === 0 || resolution(run.at(-1)!) === 'fifth')) run.push(i);
      else {
        flush();
        if (F(i).family === 'dominant') run.push(i);
      }
    }
    flush();
    // Turnarounds: I (or iii) – vi (or VI7, ♭III7) – ii – V (or SubV).
    const distinct = real.filter((i, p) => p === 0 || !sameChord(real[p - 1]!, i));
    for (let p = 0; p + 3 < distinct.length; p++) {
      const w = distinct.slice(p, p + 4);
      const key = keyAt.get(w[3]!)!;
      if (!w.every((j) => sameKey(keyAt.get(j)!, key))) continue;
      const deg = w.map((j) => semis(keyPc(key), F(j).pc));
      const last = F(w[3]!);
      const slot1 = F(w[1]!).family;
      const second = (deg[1] === 9 && (slot1 === 'minor' || slot1 === 'dominant')) || ([8, 3].includes(deg[1]!) && slot1 === 'dominant');
      const allDominants = w.every((j) => F(j).family === 'dominant');
      if (!allDominants && last.family === 'dominant' && [7, 1].includes(deg[3]!) && deg[2] === 2 && second && [0, 4].includes(deg[0]!))
        add('turnaround', `Turnaround: ${w.map((j) => chords[j]!.roman).join('–')}`, w[0]!, w[3]!);
    }
    return out.sort((a, b) => a.first - b.first);
  }

  const keyAreas: KeyArea[] = [];
  for (const c of chords) {
    const lastArea = keyAreas.at(-1);
    if (lastArea && sameKey(lastArea.key, c.key)) lastArea.lastBar = c.bar;
    else keyAreas.push({ key: c.key, firstBar: c.bar, lastBar: c.bar });
  }

  const form = formOf(chart);
  const formSummary = summariseForm(chart, form, chords, homeKey);
  const highlights = summarise(chords, patterns, keyAreas, homeKey, guessed);

  return { homeKey, homeKeyGuessed: guessed, chords, patterns, keyAreas, form, formSummary, highlights };
}

function base(it: Item) {
  return { bar: it.bar, beats: it.beats, symbol: it.symbol, ...(it.alt ? { alt: it.alt } : {}) };
}

const MAJOR_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const MINOR_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

/** Work out the home key from the chords: the key they fit best, favouring a tonic at the end and the start. */
export function guessKey(items: { beats: number; facts: ChordFacts | null }[], beatsPerBar: number): TuneKey {
  const real = items.filter((it) => it.facts);
  let best: { key: TuneKey; score: number } | null = null;
  for (const mode of ['major', 'minor'] as const) {
    for (let pc = 0; pc < 12; pc++) {
      const key: TuneKey = { tonic: (mode === 'major' ? MAJOR_KEYS : MINOR_KEYS)[pc]!, mode };
      let score = 0;
      for (const it of real) if (isDiatonic(it.facts!, key)) score += it.beats;
      const isTonic = (f: ChordFacts) => f.pc === pc && (mode === 'minor' ? f.family === 'minor' : f.family === 'major' || f.family === 'dominant');
      if (real.length && isTonic(real.at(-1)!.facts!)) score += beatsPerBar * 3;
      if (real.length && isTonic(real[0]!.facts!)) score += beatsPerBar * 2;
      if (!best || score > best.score) best = { key, score };
    }
  }
  // Spell the tonic the way the chart does, if a chord on it appears.
  const key = best!.key;
  const written = real.find((it) => it.facts!.pc === keyPc(key))?.facts!.root;
  return written ? { ...key, tonic: written } : key;
}

function formOf(chart: Chart): FormSection[] {
  const out: FormSection[] = [];
  chart.bars.forEach((bar, i) => {
    if (i === 0 || bar.section) out.push({ label: bar.section ?? '', firstBar: i, bars: 0 });
    out.at(-1)!.bars++;
  });
  return out;
}

function summariseForm(chart: Chart, form: FormSection[], chords: AnalysedChord[], home: TuneKey): string {
  const total = chart.bars.length;
  const labelled = form.filter((s) => s.label);
  if (total === 12 && labelled.length <= 1) {
    const first = chords.find((c) => c.facts);
    const bar5 = chords.find((c) => c.bar === 4 && c.facts);
    const onTonic = first && first.facts!.pc === keyPc(home);
    if (onTonic && bar5 && semis(keyPc(home), bar5.facts!.pc) === 5) {
      if (home.mode === 'major' && bar5.facts!.family === 'dominant') return '12-bar blues';
      if (home.mode === 'minor' && bar5.facts!.family === 'minor') return '12-bar minor blues';
    }
  }
  if (labelled.length >= 2) {
    const letters = form.map((s) => s.label || '?');
    const sizes = [...new Set(form.map((s) => s.bars))];
    const each = sizes.length === 1 ? ` (${sizes[0]} bars each)` : ` (${form.map((s) => s.bars).join('+')})`;
    return `${letters.join(' ')} form, ${total} bars${each}`;
  }
  return `${total} bars`;
}

function summarise(chords: AnalysedChord[], patterns: Pattern[], areas: KeyArea[], home: TuneKey, guessed: boolean): string[] {
  const out: string[] = [];
  out.push(`Home key: ${keyName(home)}${guessed ? ' (worked out from the chords)' : ''}.`);
  const centres: TuneKey[] = [];
  for (const a of areas) if (!centres.length || !sameKey(centres.at(-1)!, a.key)) centres.push(a.key);
  if (centres.length > 1) {
    const shown = centres.slice(0, 10).map(shortKeyName).join(' → ');
    out.push(`Key centres: ${shown}${centres.length > 10 ? ' → …' : ''}.`);
  }
  const iiVs = patterns.filter((p) => p.kind === 'ii-V-I' || p.kind === 'ii-V');
  if (iiVs.length) {
    const resolved = patterns.filter((p) => p.kind === 'ii-V-I').length;
    out.push(`${iiVs.length} ii–V${iiVs.length > 1 ? 's' : ''}; ${resolved === iiVs.length ? 'all' : resolved || 'none'} resolve${resolved === 1 ? 's' : ''} to a tonic.`);
  }
  const bars = (role: string | RegExp) => {
    const list = [...new Set(chords.filter((c) => (typeof role === 'string' ? c.role === role : role.test(c.role))).map((c) => c.bar + 1))];
    return list.length ? `bar${list.length > 1 ? 's' : ''} ${list.slice(0, 5).join(', ')}${list.length > 5 ? '…' : ''}` : '';
  };
  const devices: [string, string | RegExp][] = [
    ['Secondary dominants', 'Secondary dominant'],
    ['Tritone substitutes', 'Tritone substitute'],
    ['Backdoor dominants', 'Backdoor dominant'],
    ['Borrowed from the parallel minor', /^Borrowed|^Parallel minor|^Neapolitan/],
    ['Diminished passing chords', /^(Passing|Auxiliary) diminished$/],
  ];
  for (const [name, role] of devices) {
    const where = bars(role);
    if (where) out.push(`${name}: ${where}.`);
  }
  return out;
}
