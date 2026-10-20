# Notes for AI assistants working on The Shed

Read README.md first; it describes the architecture.

Rules:
- `src/core` stays pure: no DOM, no audio, no storage, no `Math.random` (take an `Rng`). Every change there gets a test.
- Only `src/audio/player.ts` touches audio libraries. Only `src/input/` touches Web MIDI and the microphone. Only `src/storage/` touches persistence.
- New levels are data in `src/core/drills/catalog.ts`, not new code.
- Use tonal for all theory (note names, intervals, chords). Don't hand-roll it.
- Mobile first: the main user practises on an Android phone. Tap targets ≥ 44px.
- Before committing: `npm test && npm run check && npm run build`.
- Keep dependencies minimal; ask before adding one.
