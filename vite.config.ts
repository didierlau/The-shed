/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  // Relative base so the build works on GitHub Pages (/The-shed/) and anywhere else.
  base: './',
  plugins: [svelte()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
