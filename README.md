# The Shed

A practice toolbox for jazz musicians, starting with ear training.
It runs in the browser and installs on Android as an app (PWA). Free, no account.

## Run it

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests for the music logic
npm run check      # type check
npm run build      # production build in dist/
```

Every push to `main` runs the tests and deploys to GitHub Pages
(enable it once: repo **Settings → Pages → Source: GitHub Actions**).

## How the code is organised

```
src/
  core/      pure music logic: theory, drills, scoring. No DOM, no audio. Fully tested.
    drills/  one file per drill kind + catalog.ts (the list of levels, as data)
    lessons/ one lesson per section (theory, key points, sounds to hear, levels to practise), as data
    tunes/   tune charts: iReal Pro import (irealb:// links, HTML exports), typed changes,
             and the harmonic analysis (key centres, Roman numerals, ii–V brackets, chord roles, scales)
    listen/  hearing you play: chord naming, MIDI note state, chord tracker, and for the mic:
             per-key spectra, strike detection, calibration, and note decomposition
  audio/     the only code that makes sound (smplr piano, synth fallback)
  input/     the only code that listens: Web MIDI and the microphone
  storage/   the only code that saves progress, custom selections and settings (localStorage today)
  ui/        Svelte screens; they display what core produces
             Home (sections) → Section (lesson, levels, "Build your own") → Drill / Lesson; Settings; Listen;
             Tunes → Tune (analysis) / Tune edit
```

The rule that keeps this maintainable: **dependencies only point inwards.**
`ui` may use `core`, `audio` and `storage`; `core` uses nothing but `tonal`.

### Adding a level

Add an entry to `src/core/drills/catalog.ts`. No other change needed.

### Editing a lesson

Lessons are data in `src/core/lessons/catalog.ts`. Examples are described (an interval, chord,
scale, progression, voicing, degree…) and turned into notes by `lessons/examples.ts`.

### Adding a new kind of drill (e.g. functional hearing)

1. Create `src/core/drills/<kind>.ts` with a config type and a `generate…Question()` that returns a `Question`.
2. Add tests next to it (`<kind>.test.ts`).
3. Add the config type to the `DrillConfig` union in `catalog.ts`, a `case` in `drills/index.ts`, and a group in `DRILL_GROUPS`.
4. Add a "Build your own" spec for it in `src/core/drills/custom.ts` (`CUSTOM_SPECS`).
5. Add levels to `DRILLS`. The UI picks them up automatically.
6. A new section also needs a lesson in `src/core/lessons/catalog.ts` (a test checks this).

## Roadmap

1. ~~Intervals~~
2. ~~Chord qualities~~ (triads, 7ths, 6ths, shells)
3. ~~Functional hearing~~ (scale degrees and diatonic chords against a ii–V–I)
4. ~~Progressions~~ (ii–V–Is, turnarounds, reharmonisations, standards building blocks)
5. ~~Jazz voicings~~ (close, shell, drop-2, rootless A/B, So What, upper structures)
6. ~~Scales~~ (modes, minor colours, dominant scales, pentatonics, blues, bebop)
7. ~~Listen: live chord naming~~ from a MIDI piano or the microphone
   - mic: each strike is matched against the user's own piano, recorded once in a
     guided calibration (quick C3–C5 or full C2–C6); a note only counts if its own
     fundamental is there, which stops low "ghost" notes
8. ~~Tunes: understand a standard~~ — import from iReal Pro or type the changes; see key centres,
   ii–V(–I)s, secondary dominants, tritone subs, backdoor and borrowed chords, the form, and
   which scales fit each chord. Works from the chords only (no melody).
9. Improvisation evaluator, building on Listen:
   - record a take (`ChordEvent`s plus every note with its time)
   - pick the tune's changes from Tunes, so each note has a chord context
   - per chord, find the scale(s) the notes fit (Dorian, Mixolydian, altered, bebop…)
     and whether that scale suits the chord and the tune's key
   - show where the line left the changes, and how often it landed on guide tones
10. Offline support (service worker) and Play Store wrapper (Capacitor)

## Tech

TypeScript · Svelte 5 · Vite · [tonal](https://github.com/tonaljs/tonal) for theory ·
[smplr](https://github.com/danigb/smplr) for piano samples · Vitest
