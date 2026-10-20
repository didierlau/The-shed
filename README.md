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
  audio/     the only code that makes sound (smplr piano, synth fallback)
  storage/   the only code that saves progress (localStorage today)
  ui/        Svelte screens; they display what core produces
```

The rule that keeps this maintainable: **dependencies only point inwards.**
`ui` may use `core`, `audio` and `storage`; `core` uses nothing but `tonal`.

### Adding a level

Add an entry to `src/core/drills/catalog.ts`. No other change needed.

### Adding a new kind of drill (e.g. functional hearing)

1. Create `src/core/drills/<kind>.ts` with a config type and a `generate…Question()` that returns a `Question`.
2. Add tests next to it (`<kind>.test.ts`).
3. Add the config type to the `DrillConfig` union in `catalog.ts`, a `case` in `drills/index.ts`, and a group in `DRILL_GROUPS`.
4. Add levels to `DRILLS`. The UI picks them up automatically.

## Roadmap

1. ~~Intervals~~
2. ~~Chord qualities~~ (triads, 7ths, 6ths, shells)
3. ~~Functional hearing~~ (scale degrees and diatonic chords against a ii–V–I)
4. ~~Progressions~~ (ii–V–Is, turnarounds, reharmonisations, standards building blocks)
5. ~~Jazz voicings~~ (close, shell, drop-2, rootless A/B, So What, upper structures)
6. Offline support (service worker) and Play Store wrapper (Capacitor)

## Tech

TypeScript · Svelte 5 · Vite · [tonal](https://github.com/tonaljs/tonal) for theory ·
[smplr](https://github.com/danigb/smplr) for piano samples · Vitest
