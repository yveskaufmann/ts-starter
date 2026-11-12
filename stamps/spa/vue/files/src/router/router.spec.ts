import { VueQueryPlugin } from '@tanstack/vue-query';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

import App from '@/App.vue';
import { queryClient } from '@/lib/query-client';

import { routes } from './index';

async function mountRoute(path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(path);
  const wrapper = mount(App, { global: { plugins: [router, createPinia(), [VueQueryPlugin, { queryClient }]] } });
  await flushPromises();
  return wrapper;
}

describe('routes', () => {
  it('shows an item', async () => {
    const wrapper = await mountRoute('/items/1');

    expect(wrapper.get('h1').text()).toBe('First item');
  });

  it('shows the not found page for unknown paths', async () => {
    const wrapper = await mountRoute('/does/not/exist');

    expect(wrapper.get('h1').text()).toBe('Page not found');
  });
});
