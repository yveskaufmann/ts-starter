import { type QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import type { Plugin } from 'vue';
import type { Router } from 'vue-router';

import { queryClient as defaultQueryClient } from '@/lib/query-client';
import { router as defaultRouter } from '@/router';

type AppPluginsOptions = {
  /** Tests pass their own router and client, so they do not share state */
  router?: Router;
  queryClient?: QueryClient;
};

/**
 * All app wide plugins in one place, used by main.ts and the test helpers. Add new global plugins (i18n, feature
 * flags, ...) here. Something only one feature needs belongs into that feature (provide/inject in its root component).
 */
export function appPlugins({
  router = defaultRouter,
  queryClient = defaultQueryClient,
}: AppPluginsOptions = {}): Plugin {
  return {
    install(app) {
      app.use(createPinia());
      app.use(router);
      app.use(VueQueryPlugin, { queryClient });
    },
  };
}
