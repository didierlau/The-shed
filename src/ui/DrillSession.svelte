<script lang="ts">
  import { generateQuestion, type DrillConfig } from '../core/drills';
  import { recordAnswer } from '../core/stats';
  import type { Question } from '../core/types';
  import { player } from '../audio/player';
  import { loadProgress, resetDrill, saveProgress } from '../storage/progress';

  let { drill }: { drill: DrillConfig } = $props();

  let progress = $state(loadProgress());
  let question = $state<Question | null>(null);
  let picked = $state<string | null>(null);
  let playing = $state(false);
  let session = $state({ asked: 0, correct: 0, streak: 0 });

  const stats = $derived(progress.drills[drill.id] ?? {});
  const answered = $derived(picked !== null);
  const wasRight = $derived(answered && picked === question?.answer);

  async function play() {
    if (!question || playing) return;
    playing = true;
    try {
      await player.play(question.playback);
    } finally {
      playing = false;
    }
  }

  async function next() {
    question = generateQuestion(drill, Math.random, stats);
    picked = null;
    await play();
  }

  function answer(value: string) {
    if (!question || answered) return;
    picked = value;
    const correct = value === question.answer;
    session = {
      asked: session.asked + 1,
      correct: session.correct + (correct ? 1 : 0),
      streak: correct ? session.streak + 1 : 0,
    };
    progress = {
      ...progress,
      drills: { ...progress.drills, [drill.id]: recordAnswer(stats, question.answer, correct) },
    };
    saveProgress(progress);
  }

  function reset() {
    if (!confirm(`Clear your saved progress for "${drill.title}"?`)) return;
    progress = resetDrill(progress, drill.id);
    saveProgress(progress);
  }

  function choiceState(value: string): string {
    if (!answered || !question) return '';
    if (value === question.answer) return 'right';
    if (value === picked) return 'wrong';
    return 'faded';
  }
</script>

<nav>
  <a href="#/">Drills</a>
  <button class="link" onclick={reset}>Reset progress</button>
</nav>

<h1>{drill.title}</h1>
<p class="lede">{drill.description}</p>

<div class="stage">
  {#if question}
    <button class="disc" class:spinning={playing} onclick={play} disabled={playing} aria-label="Play again">
      <span>{playing ? 'Listen' : 'Again'}</span>
    </button>
  {:else}
    <button class="disc" onclick={next} aria-label="Start drill">
      <span>Start</span>
    </button>
  {/if}
</div>

{#if question}
  <div class="choices" role="group" aria-label="Your answer">
    {#each question.choices as c (c.value)}
      <button class={choiceState(c.value)} onclick={() => answer(c.value)} disabled={answered}>
        {c.label}
      </button>
    {/each}
  </div>

  <div class="result" aria-live="polite">
    {#if answered}
      <p class:ok={wasRight} class:no={!wasRight}>
        {wasRight ? 'Correct' : 'Not quite'}. {question.reveal}
      </p>
      <button class="primary" onclick={next}>Next question</button>
    {:else}
      <p class="hint">{question.prompt}</p>
    {/if}
  </div>

  <p class="tally">
    {session.correct} / {session.asked} this session{#if session.streak >= 3}, {session.streak} in a row{/if}
  </p>
{/if}

<style>
  nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--step--1);
    margin-bottom: 1.25rem;
  }
  nav a, .link {
    color: var(--dim);
    background: none;
    border: 0;
    padding: 0.4rem 0;
    text-decoration: none;
  }
  nav a::before { content: '‹ '; }

  h1 {
    font-family: var(--font-display);
    font-stretch: condensed;
    font-weight: 700;
    font-size: var(--step-2);
    line-height: 1.1;
    margin: 0 0 0.3rem;
  }
  .lede { margin: 0; color: var(--dim); }

  .stage { display: grid; place-items: center; padding: 2rem 0 1.75rem; }

  /* The one bold element: a brass record you tap to hear the question. */
  .disc {
    position: relative;
    width: 9.5rem;
    aspect-ratio: 1;
    border-radius: 50%;
    border: 0;
    padding: 0;
    background: none;
    box-shadow: 0 0 0 2px var(--navy-line), 0 12px 32px rgba(0, 0, 0, 0.35);
    transition: transform 0.15s ease;
  }
  /* The grooves live on a pseudo-element so only they spin; the label stays still. */
  .disc::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background:
      radial-gradient(circle, var(--navy) 0 9%, transparent 9.5%),
      radial-gradient(circle at 50% 50%, var(--brass) 0 34%, var(--brass-deep) 34.5% 36%, transparent 36.5%),
      conic-gradient(from 0deg, rgba(255, 255, 255, 0.07), transparent 25%, rgba(255, 255, 255, 0.07) 50%, transparent 75%),
      repeating-radial-gradient(circle, #10161f 0 2px, #1c2433 2px 4px);
  }
  .disc:active { transform: scale(0.97); }
  .disc:disabled { cursor: default; }
  .disc span {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 1.1rem;
    font-family: var(--font-display);
    font-stretch: condensed;
    font-weight: 600;
    color: var(--lamp);
    letter-spacing: 0.02em;
  }
  .disc.spinning::before { animation: spin 1.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .choices {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
    gap: 0.5rem;
  }
  .choices button {
    min-height: 3.25rem;
    padding: 0.5rem;
    border-radius: 0.6rem;
    border: 1px solid var(--navy-line);
    background: var(--navy-raised);
    font-weight: 500;
  }
  .choices button:not(:disabled):active { border-color: var(--brass); }
  .choices button:disabled { cursor: default; }
  .choices .right { border-color: var(--right); color: var(--right); }
  .choices .wrong { border-color: var(--wrong); color: var(--wrong); }
  .choices .faded { opacity: 0.45; }

  .result { min-height: 6.5rem; margin-top: 1.25rem; }
  .result p { margin: 0 0 0.75rem; }
  .hint { color: var(--dim); }
  .ok { color: var(--right); }
  .no { color: var(--wrong); }

  .primary {
    width: 100%;
    min-height: 3.25rem;
    border: 0;
    border-radius: 0.6rem;
    background: var(--brass);
    color: var(--navy);
    font-weight: 700;
  }

  .tally {
    color: var(--dim);
    font-size: var(--step--1);
    font-variant-numeric: tabular-nums;
    text-align: center;
  }
</style>
