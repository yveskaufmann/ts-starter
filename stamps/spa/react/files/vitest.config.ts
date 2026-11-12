import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config.ts';

export default defineConfig((env) =>
  mergeConfig(viteConfig(env), {
    test: {
      environment: 'jsdom',
      include: ['src/**/*.spec.{ts,tsx}'],
      exclude: ['dist/**', 'node_modules/**'],
      setupFiles: ['./src/test/setup.ts'],
    },
  }),
);
