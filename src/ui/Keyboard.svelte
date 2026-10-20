<script lang="ts">
  /** A piano keyboard from C2 to C7 with the sounding notes lit. */
  let { notes }: { notes: number[] } = $props();

  const LOW = 36; // C2
  const HIGH = 96; // C7
  const BLACK = new Set([1, 3, 6, 8, 10]);

  const keys = Array.from({ length: HIGH - LOW + 1 }, (_, i) => LOW + i);
  const whites = keys.filter((k) => !BLACK.has(k % 12));
  const whiteIndex = new Map(whites.map((k, i) => [k, i]));
  const W = 10;
  const H = 54;

  const on = $derived(new Set(notes));
</script>

<svg viewBox={`0 0 ${whites.length * W} ${H}`} role="img" aria-label="Sounding notes on a keyboard" preserveAspectRatio="none">
  {#each whites as k (k)}
    <rect class="white" class:on={on.has(k)} x={whiteIndex.get(k)! * W} y="0" width={W} height={H} />
    {#if k % 12 === 0}
      <text x={whiteIndex.get(k)! * W + W / 2} y={H - 5}>C{Math.floor(k / 12) - 1}</text>
    {/if}
  {/each}
  {#each keys.filter((k) => BLACK.has(k % 12)) as k (k)}
    <rect class="black" class:on={on.has(k)} x={whiteIndex.get(k - 1)! * W + W * 0.65} y="0" width={W * 0.7} height={H * 0.6} />
  {/each}
</svg>

<style>
  svg { width: 100%; height: 4.5rem; display: block; }
  .white { fill: var(--lamp); stroke: var(--navy); stroke-width: 1; }
  .black { fill: #10161f; }
  .white.on, .black.on { fill: var(--brass); }
  text { font-size: 5px; fill: var(--navy); text-anchor: middle; opacity: 0.6; }
</style>
