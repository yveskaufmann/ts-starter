import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// The settings come from the environment or the .env files, see .env.example
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = Number(env.DEV_PORT || 5173);

  return {
    base: env.BASE_PATH || '/',
    plugins: [
      // Generates src/routeTree.gen.ts from the files in src/routes, must come before react()
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      host: env.DEV_HOST || 'localhost',
      port,
      strictPort: true,
      // Absolute URL for assets, only needed if the backend renders its own HTML
      origin: env.DEV_ORIGIN || undefined,
      hmr: env.HMR_CLIENT_PORT ? { clientPort: Number(env.HMR_CLIENT_PORT) } : undefined,
      proxy: env.API_PROXY_TARGET
        ? { '/api': { target: env.API_PROXY_TARGET, changeOrigin: true, ws: true } }
        : undefined,
    },
    preview: { port },
    build: {
      outDir: env.OUT_DIR || 'dist',
      emptyOutDir: true,
      sourcemap: true,
    },
  };
});
