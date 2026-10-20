<script lang="ts">
  import { findDrill } from '../core/drills';
  import Home from './Home.svelte';
  import DrillSession from './DrillSession.svelte';

  // Minimal hash routing: #/ is home, #/drill/<id> is a drill. Keeps the Android back button working.
  let hash = $state(location.hash);
  $effect(() => {
    const onHash = () => (hash = location.hash);
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  });

  const drill = $derived(hash.startsWith('#/drill/') ? findDrill(hash.slice('#/drill/'.length)) : undefined);
</script>

<main>
  {#if drill}
    {#key drill.id}
      <DrillSession {drill} />
    {/key}
  {:else}
    <Home />
  {/if}
</main>

<style>
  main {
    max-width: 34rem;
    margin: 0 auto;
    padding: 1.25rem 1rem 3rem;
  }
</style>
