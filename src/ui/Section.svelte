<script lang="ts">
  import { CUSTOM_SPECS, DRILLS, customDrillId, type DrillGroup } from '../core/drills';
  import { loadProgress } from '../storage/progress';
  import { summary } from './summary';

  let { group }: { group: DrillGroup } = $props();

  const progress = loadProgress();
  const levels = $derived(DRILLS.filter((d) => group.kinds.includes(d.kind)));
</script>

<nav><a href="#/">The Shed</a></nav>

<h1>{group.title}</h1>
<p class="lede">{group.description}</p>

<div class="custom">
  {#each group.kinds as kind (kind)}
    <a href={`#/custom/${kind}`}>
      <span class="title">Build your own{group.kinds.length > 1 ? `: ${CUSTOM_SPECS[kind].noun}` : ''}</span>
      <span class="desc">Pick exactly which {CUSTOM_SPECS[kind].noun} to practise.</span>
      <span class="score">{summary([progress.drills[customDrillId(kind)]])}</span>
    </a>
  {/each}
</div>

<h2>Levels</h2>
<ul>
  {#each levels as drill (drill.id)}
    <li>
      <a href={`#/drill/${drill.id}`}>
        <span class="title">{drill.title}</span>
        <span class="desc">{drill.description}</span>
        <span class="score">{summary([progress.drills[drill.id]])}</span>
      </a>
    </li>
  {/each}
</ul>

<style>
  nav { font-size: var(--step--1); margin-bottom: 1.25rem; }
  nav a { color: var(--dim); text-decoration: none; padding: 0.4rem 0; display: inline-block; }
  nav a::before { content: '‹ '; }

  h1 {
    font-family: var(--font-display);
    font-stretch: condensed;
    font-weight: 700;
    font-size: var(--step-2);
    line-height: 1.1;
    margin: 0 0 0.3rem;
  }
  .lede { margin: 0 0 1.5rem; color: var(--dim); }

  h2 {
    font-family: var(--font-display);
    font-stretch: condensed;
    font-weight: 600;
    font-size: var(--step-1);
    margin: 2rem 0 0.5rem;
  }

  .custom { display: grid; gap: 0.5rem; }
  .custom a {
    border: 1px solid var(--brass-deep);
    border-radius: 0.6rem;
    padding: 0.85rem 1rem;
    background: var(--navy-raised);
  }
  .custom .title { color: var(--brass); }

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
</style>
