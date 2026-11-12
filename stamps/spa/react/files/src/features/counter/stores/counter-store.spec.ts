import { beforeEach, describe, expect, it } from 'vitest';

import { useCounterStore } from './counter-store';

beforeEach(() => {
  useCounterStore.getState().reset();
});

describe('counter store', () => {
  it('counts up and down', () => {
    const { increment, decrement } = useCounterStore.getState();

    increment();
    increment();
    decrement();

    expect(useCounterStore.getState().count).toBe(1);
  });
});
