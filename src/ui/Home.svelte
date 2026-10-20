<script lang="ts">
  import { DRILLS, DRILL_GROUPS } from '../core/drills';
  import { accuracy, type StatsTable } from '../core/stats';
  import { loadProgress } from '../storage/progress';

  const progress = loadProgress();

  function summary(table: StatsTable | undefined): string {
    if (!table) return 'Not started';
    const totals = Object.values(table).reduce(
      (t, s) => ({ asked: t.asked + s.asked, correct: t.correct + s.correct }),
      { asked: 0, correct: 0 },
    );
    const acc = accuracy(totals);
    return acc === null ? 'Not started' : `${Math.round(acc * 100)}% of ${totals.asked}`;
  }
</script>

<header>
  <h1>The Shed</h1>
  <p>Ear training for jazz musicians. Pick a drill and start shedding.</p>
</header>

{#each DRILL_GROUPS as group (group.title)}
  <section aria-labelledby={`group-${group.kinds[0]}`}>
    <h2 id={`group-${group.kinds[0]}`}>{group.title}</h2>
    <ul>
      {#each DRILLS.filter((d) => group.kinds.includes(d.kind)) as drill (drill.id)}
        <li>
          <a href={`#/drill/${drill.id}`}>
            <span class="title">{drill.title}</span>
            <span class="desc">{drill.description}</span>
            <span class="score">{summary(progress.drills[drill.id])}</span>
          </a>
        </li>
      {/each}
    </ul>
  </section>
{/each}

<footer>Jazz voicings are next.</footer>

<style>
  header { margin: 1.5rem 0 2.25rem; }

  h1 {
    font-family: var(--font-display);
    font-stretch: condensed;
    font-weight: 700;
    font-size: var(--step-3);
    line-height: 1;
    letter-spacing: -0.01em;
    margin: 0 0 0.6rem;
    color: var(--brass);
  }

  header p { margin: 0; color: var(--dim); max-width: 28em; }

  h2 {
    font-family: var(--font-display);
    font-stretch: condensed;
    font-weight: 600;
    font-size: var(--step-1);
    margin: 0 0 0.5rem;
  }

  ul { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--navy-line); }

  li { border-bottom: 1px solid var(--navy-line); }

  a {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.15rem 1rem;
    padding: 0.95rem 0.25rem;
    color: inherit;
    text-decoration: none;
  }

  a:active { background: var(--navy-raised); }

  .title { font-weight: 600; }
  .desc { grid-column: 1; color: var(--dim); font-size: var(--step--1); }
  .score {
    grid-column: 2;
    grid-row: 1 / span 2;
    align-self: center;
    color: var(--dim);
    font-size: var(--step--1);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  section + section { margin-top: 2.25rem; }

  footer { margin-top: 2rem; color: var(--dim); font-size: var(--step--1); }
</style>
