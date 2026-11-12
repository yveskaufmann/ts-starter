import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import BaseButton from './BaseButton.vue';

describe('BaseButton', () => {
  it('emits click', async () => {
    const wrapper = mount(BaseButton, { slots: { default: 'Save' } });

    await wrapper.get('button').trigger('click');

    expect(wrapper.text()).toBe('Save');
    expect(wrapper.emitted('click')).toHaveLength(1);
  });
});
