<script lang="ts">
  import { findDrill, type DrillGroup } from '../core/drills';
  import { exampleLabel, examplePlayback, type Lesson, type LessonExample } from '../core/lessons';
  import { player } from '../audio/player';

  let { group, lesson }: { group: DrillGroup; lesson: Lesson } = $props();

  // Text may mark key words with **bold**; split so odd parts render as <strong>.
  const parts = (text: string) => text.split('**');

  let playingId = $state<string | null>(null);
  let ticket = 0;
  async function play(id: string, ex: LessonExample) {
    const mine = ++ticket;
    if (playingId === id) {
      player.stop();
      playingId = null;
      return;
    }
    playingId = id;
    try {
      await player.play(examplePlayback(ex));
    } finally {
      if (mine === ticket) playingId = null;
    }
  }

  $effect(() => () => player.stop());
</script>

{#snippet rich(text: string)}
  {#each parts(text) as part, i}{#if i % 2 === 1}<strong>{part}</strong>{:else}{part}{/if}{/each}
{/snippet}

<nav><a href={`#/section/${group.id}`}>{group.title}</a></nav>

<p class="kicker">Lesson</p>
<h1>{group.title}</h1>
<p class="lede">{lesson.intro}</p>

<section class="essentials">
  <h2>Key points</h2>
  <ul>
    {#each lesson.essentials as point}
      <li>{@render rich(point)}</li>
    {/each}
  </ul>
</section>

{#each lesson.sections as section, si}
  <section>
    <h2>{section.heading}</h2>
    {#each section.body as para}
      <p>{@render rich(para)}</p>
    {/each}
    {#if section.examples?.length}
      <div class="examples">
        {#each section.examples as ex, ei}
          {@const id = `${si}-${ei}`}
          <button class:on={playingId === id} onclick={() => play(id, ex)}>
            <span class="icon" aria-hidden="true">{playingId === id ? '■' : '▶'}</span>
            <span>{exampleLabel(ex)}</span>
          </button>
        {/each}
      </div>
    {/if}
  </section>
{/each}

<section>
  <h2>Practise it</h2>
  <ol class="practice">
    {#each lesson.practice as p (p.drill)}
      {@const drill = findDrill(p.drill)}
      {#if drill}
        <li>
          <a href={`#/drill/${drill.id}`}>
            <span class="title">{drill.title}</span>
            <span class="desc">{p.tip}</span>
          </a>
        </li>
      {/if}
    {/each}
  </ol>
</section>

<style>
  nav { font-size: var(--step--1); margin-bottom: 1.25rem; }
  nav a { color: var(--dim); text-decoration: none; padding: 0.4rem 0; display: inline-block; }
  nav a::before { content: '‹ '; }

  .kicker {
    margin: 0;
    color: var(--brass);
    font-size: var(--step--1);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  h1 {
    font-family: var(--font-display);
    font-stretch: condensed;
    font-weight: 700;
    font-size: var(--step-2);
    line-height: 1.1;
    margin: 0 0 0.5rem;
  }
  .lede { margin: 0 0 1.25rem; color: var(--dim); }

  h2 {
    font-family: var(--font-display);
    font-stretch: condensed;
    font-weight: 600;
    font-size: var(--step-1);
    margin: 1.75rem 0 0.5rem;
  }
  p { margin: 0 0 0.75rem; }
  strong { color: var(--brass); font-weight: 600; }

  .essentials {
    border: 1px solid var(--brass-deep);
    border-radius: 0.6rem;
    background: var(--navy-raised);
    padding: 0.25rem 1rem 0.5rem;
  }
  .essentials h2 { margin-top: 0.75rem; }
  .essentials ul { margin: 0; padding-left: 1.1rem; }
  .essentials li { margin-bottom: 0.5rem; }

  .examples { display: grid; gap: 0.5rem; margin-top: 0.25rem; }
  .examples button {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-height: 44px;
    padding: 0.55rem 0.9rem;
    text-align: left;
    border: 1px solid var(--navy-line);
    border-radius: 0.6rem;
    background: var(--navy-raised);
  }
  .examples button.on { border-color: var(--brass); }
  .icon { color: var(--brass); width: 1rem; flex: none; text-align: center; }

  .practice { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--navy-line); }
  .practice li { border-bottom: 1px solid var(--navy-line); }
  .practice a {
    display: grid;
    gap: 0.15rem;
    padding: 0.85rem 0.25rem;
    color: inherit;
    text-decoration: none;
  }
  .practice a:active { background: var(--navy-raised); }
  .title { font-weight: 600; }
  .desc { color: var(--dim); font-size: var(--step--1); }
</style>
