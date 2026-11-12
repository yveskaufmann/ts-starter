import { flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mountWithPlugins } from '@/test/mount';

import HealthStatus from './HealthStatus.vue';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HealthStatus', () => {
  it('shows the status of the backend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ status: 'ok' })));

    const wrapper = mountWithPlugins(HealthStatus);
    await vi.waitFor(async () => {
      await flushPromises();
      expect(wrapper.text()).toContain('Backend status: ok');
    });
  });

  it('explains what to do without a backend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const wrapper = mountWithPlugins(HealthStatus);
    await vi.waitFor(async () => {
      await flushPromises();
      expect(wrapper.text()).toContain('No backend answered');
    });
  });
});
