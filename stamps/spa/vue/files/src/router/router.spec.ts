import { flushPromises } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import { mountRoute } from '@/test/mount';

describe('routes', () => {
  it('shows an item', async () => {
    const { wrapper } = await mountRoute('/items/1');

    expect(wrapper.get('h1').text()).toBe('First item');
  });

  it('navigates from the list to an item', async () => {
    const { wrapper, router } = await mountRoute('/items');

    await wrapper.get('a[href="/items/2"]').trigger('click');
    await router.isReady();
    await flushPromises();

    expect(wrapper.get('h1').text()).toBe('Second item');
  });

  it('shows the not found page for unknown paths', async () => {
    const { wrapper } = await mountRoute('/does/not/exist');

    expect(wrapper.get('h1').text()).toBe('Page not found');
  });
});
