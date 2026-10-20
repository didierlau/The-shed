<script lang="ts">
  import {
    buildCustomDrill,
    customKindFromId,
    findDrill,
    findGroup,
    groupOfKind,
    CUSTOM_SPECS,
    type DrillKind,
  } from '../core/drills';
  import { loadCustomSelection } from '../storage/custom';
  import Home from './Home.svelte';
  import Section from './Section.svelte';
  import CustomSetup from './CustomSetup.svelte';
  import DrillSession from './DrillSession.svelte';
  import SettingsPage from './Settings.svelte';
  import Listen from './Listen.svelte';

  // Hash routing keeps the Android back button working:
  //   #/                  sections
  //   #/section/<id>      a section's levels and "Build your own"
  //   #/custom/<kind>     pick items for your own mix
  //   #/drill/<id>        practise (a level, or custom-<kind>)
  //   #/settings          app-wide settings
  //   #/listen            play your piano, see chord names
  let hash = $state(location.hash);
  $effect(() => {
    const onHash = () => {
      hash = location.hash;
      window.scrollTo(0, 0);
    };
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  });

  const route = $derived.by(() => {
    const [, page = '', id = ''] = hash.split('/');
    if (page === 'settings') return { page: 'settings' as const };
    if (page === 'listen') return { page: 'listen' as const };
    if (page === 'section') {
      const group = findGroup(id);
      if (group) return { page: 'section' as const, group };
    }
    if (page === 'custom' && id in CUSTOM_SPECS) {
      return { page: 'custom' as const, kind: id as DrillKind };
    }
    if (page === 'drill') {
      const customKind = customKindFromId(id);
      if (customKind) {
        return {
          page: 'drill' as const,
          drill: buildCustomDrill(customKind, loadCustomSelection(customKind)),
          back: { href: `#/custom/${customKind}`, label: 'Change selection' },
        };
      }
      const drill = findDrill(id);
      if (drill) {
        const group = groupOfKind(drill.kind);
        return { page: 'drill' as const, drill, back: { href: `#/section/${group.id}`, label: group.title } };
      }
    }
    return { page: 'home' as const };
  });
</script>

<main>
  {#if route.page === 'drill'}
    {#key route.drill.id + route.drill.description}
      <DrillSession drill={route.drill} back={route.back} />
    {/key}
  {:else if route.page === 'custom'}
    {#key route.kind}
      <CustomSetup kind={route.kind} />
    {/key}
  {:else if route.page === 'listen'}
    <Listen />
  {:else if route.page === 'settings'}
    <SettingsPage />
  {:else if route.page === 'section'}
    {#key route.group.id}
      <Section group={route.group} />
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
