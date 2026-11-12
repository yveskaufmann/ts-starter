import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useCounterStore } from './counter';

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('counter store', () => {
  it('counts up and down', () => {
    const counter = useCounterStore();

    counter.increment();
    counter.increment();
    counter.decrement();

    expect(counter.count).toBe(1);
  });
});
