<script lang="ts">
  import { DRILLS, DRILL_GROUPS, customDrillId, type DrillKind } from '../core/drills';
  import { loadProgress } from '../storage/progress';
  import { summary } from './summary';

  const progress = loadProgress();

  function groupSummary(kinds: DrillKind[]): string {
    const ids = [
      ...DRILLS.filter((d) => kinds.includes(d.kind)).map((d) => d.id),
      ...kinds.map((k) => customDrillId(k)),
    ];
    return summary(ids.map((id) => progress.drills[id]));
  }
</script>

<header>
  <div class="top">
    <h1>The Shed</h1>
    <a class="settings" href="#/settings">Settings</a>
  </div>
  <p>Ear training for jazz musicians.</p>
</header>

<ul>
  {#each DRILL_GROUPS as group (group.id)}
    <li>
      <a href={`#/section/${group.id}`}>
        <span class="title">{group.title}</span>
        <span class="desc">{group.description}</span>
        <span class="score">{groupSummary(group.kinds)}</span>
      </a>
    </li>
  {/each}
</ul>

<a class="listen" href="#/listen">
  <span class="title">Listen</span>
  <span class="desc">Play your piano and see the chord names.</span>
</a>

<style>
  header { margin: 1.5rem 0 1.75rem; }

  h1 {
    font-family: var(--font-display);
    font-stretch: condensed;
    font-weight: 700;
    font-size: var(--step-3);
    line-height: 1;
    letter-spacing: -0.01em;
    margin: 0 0 0.5rem;
    color: var(--brass);
  }

  header p { margin: 0; color: var(--dim); }

  .top { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; }
  .settings {
    color: var(--dim);
    font-size: var(--step--1);
    text-decoration: none;
    padding: 0.6rem 0;
  }

  ul { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--navy-line); }
  li { border-bottom: 1px solid var(--navy-line); }

  a {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.1rem 1rem;
    padding: 0.9rem 0.25rem;
    color: inherit;
    text-decoration: none;
  }
  a:active { background: var(--navy-raised); }

  .title {
    font-family: var(--font-display);
    font-stretch: condensed;
    font-weight: 600;
    font-size: var(--step-1);
  }
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
  .score::after { content: ' ›'; }

  .listen {
    margin-top: 1.25rem;
    border: 1px solid var(--brass-deep);
    border-radius: 0.6rem;
    padding: 0.85rem 1rem;
    background: var(--navy-raised);
  }
  .listen .title { color: var(--brass); }
</style>
