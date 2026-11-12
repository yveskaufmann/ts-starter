import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import HealthStatus from './HealthStatus.vue';

function mountWithQuery() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return mount(HealthStatus, { global: { plugins: [[VueQueryPlugin, { queryClient }]] } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HealthStatus', () => {
  it('shows the status of the backend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ status: 'ok' })));

    const wrapper = mountWithQuery();
    await vi.waitFor(async () => {
      await flushPromises();
      expect(wrapper.text()).toContain('Backend status: ok');
    });
  });

  it('explains what to do without a backend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const wrapper = mountWithQuery();
    await vi.waitFor(async () => {
      await flushPromises();
      expect(wrapper.text()).toContain('No backend answered');
    });
  });
});
