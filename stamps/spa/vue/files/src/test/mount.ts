import { QueryClient } from '@tanstack/vue-query';
import { flushPromises, mount } from '@vue/test-utils';
import type { Component } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';

import App from '@/App.vue';
import { appPlugins } from '@/plugins';
import { routes } from '@/router';

/** A fresh QueryClient per test, without retries, so tests do not share cached data or wait for retries. */
export function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
}

function testPlugins() {
  const router = createRouter({ history: createMemoryHistory(), routes });
  return { router, plugin: appPlugins({ router, queryClient: createTestQueryClient() }) };
}

/** Mount a component with the plugins of the app (src/plugins.ts): Pinia, router and TanStack Query. */
export function mountWithPlugins(component: Component, options: { props?: Record<string, unknown> } = {}) {
  const { plugin } = testPlugins();
  return mount(component, { ...options, global: { plugins: [plugin] } });
}

/** Mount the whole app at a path, with layout and the not found page. */
export async function mountRoute(path: string) {
  const { router, plugin } = testPlugins();
  await router.push(path);
  const wrapper = mount(App, { global: { plugins: [plugin] } });
  await flushPromises();
  return { wrapper, router };
}
