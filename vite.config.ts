import { defineConfig } from 'vitest/config';

// Relative base so the build works on GitHub Pages and as a static folder.
export default defineConfig({
  base: './',
  test: { environment: 'node' },
});
