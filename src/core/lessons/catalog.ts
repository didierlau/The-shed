import type { LessonExample } from './examples';

/**
 * One lesson per section (DrillGroup), written as data. Text may use **bold**
 * for the words that matter most; the UI renders it, nothing else is markup.
 */
export interface LessonSection {
  heading: string;
  body: string[];
  examples?: LessonExample[];
}

export interface Lesson {
  /** The DrillGroup id this lesson belongs to. */
  group: string;
  intro: string;
  /** The few things to remember, shown first. */
  essentials: string[];
  sections: LessonSection[];
  /** Levels to practise next, in order, with what to listen for. */
  practice: { drill: string; tip: string }[];
}

export const LESSONS: Lesson[] = [
  {
    group: 'intervals',
    intro:
      'An interval is the distance between two notes. Every chord, scale and melody is made of them, so hearing intervals quickly is the base of everything else in The Shed.',
    essentials: [
      'Count in **half steps** (semitones): m2 = 1, M2 = 2, m3 = 3, M3 = 4, P4 = 5, tritone = 6, P5 = 7.',
      'The **3rd** decides major or minor; the **7th** decides the type of 7th chord. Together they are the **guide tones**.',
      'The **tritone** (3rd + 7th of a dominant chord) is the sound of tension wanting to resolve.',
      'Learn each interval by its **character**, not by songs alone: open, sweet, tense, dark.',
    ],
    sections: [
      {
        heading: 'Melodic and harmonic',
        body: [
          'Played one after the other an interval is **melodic**; played together it is **harmonic**. Harmonic intervals are harder: listen for whether the two notes blend (consonant) or rub (dissonant).',
          'Consonant: unison, octave, 5th, 4th, 3rds and 6ths. Dissonant: 2nds, 7ths and the tritone. In jazz the dissonant ones are not wrong — they are the colour.',
        ],
        examples: [
          { kind: 'interval', interval: '5P', label: 'Perfect 5th — open, hollow' },
          { kind: 'interval', interval: '7M', label: 'Major 7th — bright rub' },
        ],
      },
      {
        heading: 'Perfect intervals: the skeleton',
        body: [
          'The 4th, 5th and octave sound pure and empty: no major or minor in them. They are the frame of chords (root and 5th) and the sound of modern quartal voicings (stacked 4ths).',
          'A 4th turned upside down is a 5th. Inversions always add up to 9: a 3rd inverts to a 6th, a 2nd to a 7th.',
        ],
        examples: [
          { kind: 'interval', interval: '4P' },
          { kind: 'interval', interval: '8P' },
        ],
      },
      {
        heading: 'Thirds: the colour of a chord',
        body: [
          'A **major 3rd** (4 half steps) sounds bright and settled; a **minor 3rd** (3) sounds darker. This one half step is the difference between Cmaj7 and Cm7.',
          'If you get confused, sing the note in between: a major 3rd has two whole steps inside (C–D–E), a minor 3rd a whole and a half (C–D–E♭).',
        ],
        examples: [
          { kind: 'interval', interval: '3M' },
          { kind: 'interval', interval: '3m' },
        ],
      },
      {
        heading: '6ths and 7ths: the jazz colours',
        body: [
          'The **minor 7th** (10) is the 7th of dominant and minor 7th chords: bluesy, wants to fall. The **major 7th** (11) is the dreamy maj7 sound, a half step below the octave. The **major 6th** (9) is the sweet tonic colour of C6.',
          'Trick: compare a 7th with the octave. A major 7th is "almost an octave"; a minor 7th is clearly a step short.',
        ],
        examples: [
          { kind: 'interval', interval: '7m' },
          { kind: 'interval', interval: '6M' },
        ],
      },
      {
        heading: 'The tritone and the guide tones',
        body: [
          'The tritone (6 half steps) splits the octave exactly in half. In G7 the 3rd (B) and the 7th (F) form a tritone, and that tension pulls into C: B rises to C, F falls to E.',
          'Jazz pianists comp with just these guide tones. When you hear a tritone, think "dominant chord".',
        ],
        examples: [
          { kind: 'interval', interval: '4A', root: 'B3', label: 'Tritone B–F' },
          { kind: 'steps', label: 'B–F resolving to C–E', steps: [[['B3', 'F4'], 2], [['C4', 'E4'], 2.5]] },
        ],
      },
    ],
    practice: [
      { drill: 'intervals-perfect', tip: 'Listen for open and empty versus full.' },
      { drill: 'intervals-thirds', tip: 'Bright or dark — decide in one second.' },
      { drill: 'intervals-sevenths', tip: 'Compare each 7th against an imagined octave.' },
      { drill: 'intervals-guide-tones', tip: 'Tense tritone = dominant; 3rds and 7ths = chord colour.' },
      { drill: 'intervals-all', tip: 'Adaptive: it asks more of what you miss.' },
    ],
  },
  {
    group: 'chords',
    intro:
      'A chord quality is the colour of a chord regardless of its root. Jazz runs on 7th chords, and a handful of qualities cover almost every chart you will read.',
    essentials: [
      'Triads stack two 3rds: **major** (M3 + m3), **minor** (m3 + M3), **diminished** (m3 + m3), **augmented** (M3 + M3).',
      'The **big three** 7ths: **maj7** (dreamy, at rest), **7** (dominant, tense, wants to move), **m7** (soft, the ii chord).',
      'Minor ii–V colours: **m7♭5** (half-diminished) and **7♭9**; **dim7** is fully symmetrical.',
      'Hear the **3rd first** (major or minor), **then the 7th** (major or minor 7th). That names most chords.',
    ],
    sections: [
      {
        heading: 'Triads',
        body: [
          'Major triads sound bright and stable, minor ones darker. Diminished is tight and unstable (two minor 3rds); augmented sounds stretched and unresolved (two major 3rds), like a question.',
        ],
        examples: [
          { kind: 'chord', quality: 'M' },
          { kind: 'chord', quality: 'm' },
          { kind: 'chord', quality: 'dim' },
          { kind: 'chord', quality: 'aug' },
        ],
      },
      {
        heading: 'The big three 7th chords',
        body: [
          'Add a 7th to a triad and you get the jazz sound. **Cmaj7** = major triad + major 7th: lush and settled, a home chord. **C7** = major triad + minor 7th: the tritone between 3rd and 7th makes it restless. **Cm7** = minor triad + minor 7th: mellow, often the ii of a ii–V.',
          'A quick test: if the chord wants to go somewhere, it is probably dominant.',
        ],
        examples: [
          { kind: 'chord', quality: 'maj7' },
          { kind: 'chord', quality: '7' },
          { kind: 'chord', quality: 'm7' },
        ],
      },
      {
        heading: 'Minor ii–V colours',
        body: [
          '**m7♭5** (half-diminished, ø) is a m7 with a flattened 5th: darker and more fragile. It is the ii chord in minor keys. **dim7** stacks only minor 3rds; it sounds suspended and dramatic and is often a passing chord.',
          '**7♭9** is a dominant with a ♭9 on top — the V in a minor ii–V, with a Spanish or classical edge.',
        ],
        examples: [
          { kind: 'chord', quality: 'm7b5' },
          { kind: 'chord', quality: 'dim7' },
          { kind: 'chord', quality: '7b9' },
        ],
      },
      {
        heading: 'Tonic colours: 6ths and minor-major',
        body: [
          'Instead of maj7, a tonic can be a **6** chord (C E G A): sweeter and more old-school swing. For minor tonics jazz prefers **m6** or **mMaj7** (C E♭ G B, the "spy movie" chord) over m7.',
          '**7sus4** replaces the 3rd with the 4th: a floating dominant, common in modal and modern tunes.',
        ],
        examples: [
          { kind: 'chord', quality: '6' },
          { kind: 'chord', quality: 'm6' },
          { kind: 'chord', quality: 'mMaj7' },
          { kind: 'chord', quality: '7sus4' },
        ],
      },
      {
        heading: 'Shells: what comping really sounds like',
        body: [
          'Pianists rarely play all four notes. A **shell** is root + 3rd + 7th: the 5th adds little, so it is left out. Practising on shells trains you to hear quality from the guide tones alone, as you will in a band.',
        ],
        examples: [
          { kind: 'steps', label: 'Shells: Cmaj7, C7, Cm7', steps: [[['C3', 'E3', 'B3'], 2], [['C3', 'E3', 'Bb3'], 2], [['C3', 'Eb3', 'Bb3'], 2.5]] },
        ],
      },
    ],
    practice: [
      { drill: 'chords-triads-basic', tip: 'Bright or dark.' },
      { drill: 'chords-sevenths-core', tip: 'At rest (maj7), restless (7), or mellow (m7)?' },
      { drill: 'chords-sevenths-minor-ii-v', tip: 'Listen for the flat 5th in m7♭5.' },
      { drill: 'chords-shells', tip: 'Only three notes: focus on the 3rd and 7th.' },
      { drill: 'chords-all', tip: 'Adaptive across every quality.' },
    ],
  },
  {
    group: 'functional',
    intro:
      'Functional hearing is hearing notes and chords by their role in a key, not by their absolute pitch. Every question starts with a ii–V–I to set the key; then you name the degree or chord against it.',
    essentials: [
      'Each degree has a **feel** against the key: 1 is home, 5 stable, 3 sweet, 7 leans up to 1, 4 leans down to 3.',
      'If unsure, **sing the note back home**: notes below 5 walk down to 1, notes above walk up to 8.',
      'Chords have **jobs**: tonic (I, iii, vi) rests, subdominant (ii, IV) moves away, dominant (V, vii) creates tension.',
      '**Blue notes** — ♭3, ♭5, ♭7 — clash with the major key on purpose. They are the blues inside jazz.',
    ],
    sections: [
      {
        heading: 'Why the cadence first?',
        body: [
          'A single note means nothing on its own. After a ii–V–I your ear knows where home is, and every note gets a role. This is the approach of the Functional Ear Trainer method, and it transfers straight to playing tunes: you hear "that\'s the 6" rather than "that\'s an A".',
          'After you answer, the app plays the note resolving to the tonic. Sing along — the resolution is the memory hook.',
        ],
        examples: [
          { kind: 'degree', degree: '1', label: '1 — home' },
          { kind: 'degree', degree: '5', label: '5 — stable, open' },
          { kind: 'degree', degree: '3', label: '3 — sweet' },
        ],
      },
      {
        heading: 'Tendency tones',
        body: [
          'Some degrees want to move. **7** (the leading tone) pulls up to 1. **4** wants to fall to 3. **2** sits on top of 1 like an open question. **6** is warm but unresolved, drifting to 5 or up to 1.',
          'These pulls are exactly what makes V7 → I work: its 7th (degree 4) falls to 3, its 3rd (degree 7) rises to 1.',
        ],
        examples: [
          { kind: 'degree', degree: '7', label: '7 — leans up to 1' },
          { kind: 'degree', degree: '4', label: '4 — leans down to 3' },
          { kind: 'degree', degree: '6' },
        ],
      },
      {
        heading: 'Blue notes and chromatic degrees',
        body: [
          'The **♭3** against a major key is the classic blues rub; **♭7** sounds like a dominant chord on I; **♭5** is the most biting blue note. All twelve degrees appear in jazz lines, often as passing or approach notes a half step from a chord tone.',
        ],
        examples: [
          { kind: 'degree', degree: 'b3' },
          { kind: 'degree', degree: 'b7' },
          { kind: 'degree', degree: 'b5' },
        ],
      },
      {
        heading: 'Chord functions',
        body: [
          'The seven chords of a major key: **Imaj7, ii7, iii7, IVmaj7, V7, vi7, viiø7**. Group them by job. **Tonic**: I (and its substitutes iii and vi) — rest. **Subdominant**: ii and IV — moving away. **Dominant**: V and vii — tension that wants I.',
          'Tell IV and ii apart by quality (major vs minor). Tell vi from ii by weight: vi sounds like a sad version of home, ii like the start of a journey.',
        ],
        examples: [
          { kind: 'function', fn: 'IV' },
          { kind: 'function', fn: 'V' },
          { kind: 'function', fn: 'vi' },
          { kind: 'function', fn: 'ii' },
        ],
      },
    ],
    practice: [
      { drill: 'degrees-triad', tip: 'Start with 1, 3, 5. Sing each one home.' },
      { drill: 'degrees-major', tip: 'Feel the pull of 7 and 4.' },
      { drill: 'degrees-blue', tip: 'Which note rubs against the major sound?' },
      { drill: 'functions-primary', tip: 'Home, away or tension?' },
      { drill: 'functions-ii-v-vi', tip: 'Minor chords: ii starts a journey, vi is a sad home.' },
    ],
  },
  {
    group: 'progressions',
    intro:
      'Standards are built from a small set of chord progressions. Recognise them by ear and you can follow — and memorise — tunes far faster.',
    essentials: [
      'The **ii–V–I** is the most important sound in jazz. Major: m7 → 7 → maj7. Minor: m7♭5 → 7♭9 → m6.',
      'Roots mostly move **up a 4th** (down a 5th): D → G → C. That is the cycle of 5ths.',
      '**Guide tones** move by half step or stay put: the 7th of each chord falls to the 3rd of the next.',
      'Reharmonisations swap chords that share a function: **tritone sub** (♭II7 for V7), **backdoor** (♭VII7), turning vi into **VI7**.',
    ],
    sections: [
      {
        heading: 'The ii–V–I',
        body: [
          'In C: Dm7 – G7 – Cmaj7. Subdominant → dominant → tonic. You will find it in almost every bar of tunes like "Autumn Leaves" or "All the Things You Are", often moving through several keys.',
          'In minor the colours darken: Dø7 – G7♭9 – Cm6. Listen for the fragile half-diminished start and the ♭9 tension.',
        ],
        examples: [
          { kind: 'progression', progression: 'ii-V-I' },
          { kind: 'progression', progression: 'ii-V-i' },
        ],
      },
      {
        heading: 'Guide-tone lines',
        body: [
          'Play just 3rds and 7ths through a ii–V–I and you get a smooth line: the 7th of Dm7 (C) falls to the 3rd of G7 (B); the 7th of G7 (F) falls to the 3rd of Cmaj7 (E). Hearing this voice-leading is what makes changes feel inevitable — and it is the skeleton of good improvised lines.',
        ],
        examples: [
          { kind: 'steps', label: 'Guide tones through ii–V–I', steps: [[['D2', 'F3', 'C4'], 2], [['G2', 'F3', 'B3'], 2], [['C3', 'E3', 'B3'], 3]] },
        ],
      },
      {
        heading: 'Turnarounds',
        body: [
          'A turnaround leads back to the top of a tune: **I–vi–ii–V**. Make the vi a dominant (**VI7**) and it pulls harder into ii — a secondary dominant (V of ii). Start on iii instead of I (**iii–VI7–ii–V**) for a smoother, more searching sound.',
        ],
        examples: [
          { kind: 'progression', progression: 'I-vi-ii-V' },
          { kind: 'progression', progression: 'I-VI7-ii-V' },
          { kind: 'progression', progression: 'iii-VI7-ii-V' },
        ],
      },
      {
        heading: 'Reharmonisation',
        body: [
          'The **tritone sub**: G7 and D♭7 share the same tritone (B and F/C♭), so D♭7 can replace G7. The bass then slides down by half step: Dm7 – D♭7 – C.',
          'The **Dameron turnaround** (I–♭III7–♭VI7–♭II7) chains tritone subs. The **backdoor ii–V** (iv–♭VII7–I, Fm7–B♭7–C) reaches home from below, with a warm, bluesy sound.',
        ],
        examples: [
          { kind: 'steps', label: 'G7 and D♭7 share B and F', steps: [[['G2', 'F3', 'B3'], 2], [['Db3', 'F3', 'B3'], 2], [['C3', 'E3', 'B3'], 3]] },
          { kind: 'progression', progression: 'I-vi-ii-bII7' },
          { kind: 'progression', progression: 'backdoor' },
        ],
      },
      {
        heading: 'Building blocks of standards',
        body: [
          'The **rhythm-changes bridge** (III7–VI7–II7–V7) is a chain of dominants round the cycle of 5ths, from "I Got Rhythm". The **blues** starts I7–IV7–I7: every chord is a dominant. Spotting these blocks lets you hear the form of a tune instead of single chords.',
        ],
        examples: [
          { kind: 'progression', progression: 'rhythm-bridge' },
          { kind: 'progression', progression: 'blues-start' },
        ],
      },
    ],
    practice: [
      { drill: 'progressions-ii-v', tip: 'Major or minor: listen to the first chord.' },
      { drill: 'progressions-turnarounds', tip: 'Is the second chord minor (vi) or dominant (VI7)?' },
      { drill: 'progressions-colours', tip: 'Follow the bass: half steps mean tritone subs.' },
      { drill: 'progressions-standards', tip: 'All dominants? Rhythm bridge or blues.' },
    ],
  },
  {
    group: 'scales',
    intro:
      'In jazz a scale is a palette of notes that fit a chord. Knowing which scale sounds over which chord — and hearing the difference — is the bridge to improvising.',
    essentials: [
      'Over a ii–V–I in C, one parent scale gives three modes: **D Dorian** (ii), **G Mixolydian** (V), **C major** (I).',
      'Each mode has one **characteristic note**: Dorian ♮6, Lydian ♯11, Mixolydian ♭7, Phrygian ♭2, Locrian ♭5.',
      'Dominant chords take the most colours: **Mixolydian** (plain), **Lydian dominant** (♯11), **altered** (all tensions), **diminished** (♭9 ♯9 13).',
      '**Melodic minor** is the jazz source scale: its modes give the altered scale, Lydian dominant and Locrian ♮2.',
    ],
    sections: [
      {
        heading: 'The modes of the major scale',
        body: [
          'Play the C major scale from D to D and you get D **Dorian**; from G to G, G **Mixolydian**. Same notes, different home, different mood. Compare each mode with the major or natural minor scale and listen for the one note that differs: that note is its flavour.',
          'Bright to dark: Lydian, Ionian, Mixolydian, Dorian, Aeolian, Phrygian, Locrian.',
        ],
        examples: [
          { kind: 'scale', scale: 'dorian', root: 'D4' },
          { kind: 'scale', scale: 'mixolydian', root: 'G3' },
          { kind: 'scale', scale: 'lydian' },
        ],
      },
      {
        heading: 'Minor colours',
        body: [
          '**Dorian** (♮6) is the jazzy minor, over m7 chords. **Aeolian** (♭6) is the sad natural minor. **Harmonic minor** (♭6 and ♮7) has the exotic gap that fits the minor ii–V–i. **Melodic minor** (♮6 and ♮7) is smooth and modern, over m6 and mMaj7.',
          'Listen to the 6th and 7th degrees — that is where minor scales differ.',
        ],
        examples: [
          { kind: 'scale', scale: 'aeolian' },
          { kind: 'scale', scale: 'harmonic minor' },
          { kind: 'scale', scale: 'melodic minor' },
        ],
      },
      {
        heading: 'Dominant sounds',
        body: [
          'A V7 chord can carry many tensions, so the scale choice is yours. **Mixolydian**: inside, bluesy. **Lydian dominant** (♯11): bright, floating — great for non-resolving 7ths and tritone subs. **Altered** (♭9 ♯9 ♯11 ♭13): maximum tension before resolving, the modern bebop choice. **Half-whole diminished**: symmetrical, ♭9 with a natural 13. **Whole tone**: dreamy, for 7♯5.',
        ],
        examples: [
          { kind: 'scale', scale: 'lydian dominant', root: 'G3' },
          { kind: 'scale', scale: 'altered', root: 'G3' },
          { kind: 'scale', scale: 'half-whole diminished', root: 'G3' },
        ],
      },
      {
        heading: 'Pentatonics, blues and bebop',
        body: [
          'Five-note **pentatonics** have no half steps, so they never clash — useful for clear, strong lines. The **blues scale** adds the ♭5 to minor pentatonic.',
          '**Bebop scales** add one chromatic passing note (Mixolydian + major 7th) so that, played in 8th notes from a chord tone on the beat, chord tones land on the downbeats. That is the secret of bebop lines.',
        ],
        examples: [
          { kind: 'scale', scale: 'minor pentatonic' },
          { kind: 'scale', scale: 'blues' },
          { kind: 'scale', scale: 'bebop', root: 'G3' },
        ],
      },
    ],
    practice: [
      { drill: 'scales-ii-v-i', tip: 'Dorian ♮6, Mixolydian ♭7, major ♮7.' },
      { drill: 'scales-modes', tip: 'Listen for each mode\'s characteristic note.' },
      { drill: 'scales-minor', tip: 'Focus on degrees 6 and 7.' },
      { drill: 'scales-dominant', tip: 'How much tension? Inside, bright, or all-out.' },
      { drill: 'scales-blues-bebop', tip: 'Count notes: 5, 6, or 8.' },
    ],
  },
  {
    group: 'voicings',
    intro:
      'A voicing is how a chord\'s notes are spread on the keyboard. The same Dm7 can sound thick, open or modern depending on the voicing — and good voicings make comping sound like jazz.',
    essentials: [
      '**Guide tones (3 and 7) are essential**; the root is often left to the bass player and the 5th is optional.',
      '**Shell**: root + 3 + 7. **Drop-2**: close voicing with the 2nd-highest note dropped an octave — open and smooth.',
      '**Rootless A** (3-5-7-9) and **B** (7-9-3-5) alternate through a ii–V–I with minimal hand movement.',
      '**So What** (stacked 4ths + a 3rd) and **upper structures** (a triad on top of 3 and 7) are the modern sounds.',
    ],
    sections: [
      {
        heading: 'Close, shell and drop-2',
        body: [
          '**Close position** (1-3-5-7 within an octave) is clear but dense in the left hand. **Shells** strip it to root, 3rd and 7th — the Bud Powell left hand. **Drop-2** takes the second note from the top of a close voicing and drops it an octave: the chord opens up and sounds like a horn section.',
        ],
        examples: [
          { kind: 'voicing', voicing: 'close', quality: 'm7', root: 'D3' },
          { kind: 'voicing', voicing: 'shell', quality: 'm7', root: 'D3' },
          { kind: 'voicing', voicing: 'drop2', quality: 'm7', root: 'D3' },
        ],
      },
      {
        heading: 'Rootless voicings',
        body: [
          'Made famous by Bill Evans and Wynton Kelly: leave out the root, add the 9th. **A form** has the 3rd at the bottom (3-5-7-9), **B form** the 7th (7-9-3-5).',
          'Through a ii–V–I they alternate A-B-A or B-A-B and the hand barely moves: the 7th of one chord slides a half step to the 3rd of the next. Over the bass, they sound complete and rich.',
        ],
        examples: [
          { kind: 'voicing', voicing: 'rootlessA', quality: 'm7', root: 'D3' },
          { kind: 'voicing', voicing: 'rootlessB', quality: '7', root: 'G2' },
          { kind: 'voicing', voicing: 'rootlessA', quality: 'maj7', root: 'C3' },
        ],
      },
      {
        heading: 'Modern colours',
        body: [
          'The **So What** voicing (from Bill Evans on "Kind of Blue") stacks three 4ths with a major 3rd on top: open, ambiguous, modal. It works on minor chords.',
          '**Upper structures** put a bright triad over the guide tones of a dominant. A D major triad over C7\'s E and B♭ gives 9, ♯11 and 13 — the Lydian dominant sound in a single grip.',
        ],
        examples: [
          { kind: 'voicing', voicing: 'soWhat', quality: 'm7', root: 'D3' },
          { kind: 'voicing', voicing: 'upperStructure', quality: '7', root: 'C3' },
        ],
      },
      {
        heading: 'How to hear the difference',
        body: [
          'Listen to the **bottom note above the bass** and the **spacing**. Close voicings sound packed; drop-2 has a gap in the middle; rootless A starts on a bright 3rd, B on a darker 7th; So What sounds hollow and evenly spaced in 4ths.',
          'Then play each one on your piano in a ii–V–I in a few keys. The ear and the hands learn faster together.',
        ],
      },
    ],
    practice: [
      { drill: 'voicings-basics', tip: 'Packed, sparse or open?' },
      { drill: 'voicings-rootless', tip: 'Lowest note: 3rd (A) or 7th (B)?' },
      { drill: 'voicings-comping', tip: 'All four comping shapes mixed.' },
      { drill: 'voicings-modern', tip: 'Hollow 4ths or a bright triad on top?' },
    ],
  },
];

export function findLesson(group: string): Lesson | undefined {
  return LESSONS.find((l) => l.group === group);
}
