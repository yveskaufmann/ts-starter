import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/render';

import { useCounterStore } from '../stores/counter-store';
import { Counter } from './counter';

beforeEach(() => {
  // Zustand stores are module singletons, reset them so tests do not depend on each other
  useCounterStore.getState().reset();
});

describe('Counter', () => {
  it('counts on click', async () => {
    const { user } = renderWithProviders(<Counter />);

    await user.click(screen.getByRole('button', { name: 'Increment' }));
    await user.click(screen.getByRole('button', { name: 'Increment' }));
    await user.click(screen.getByRole('button', { name: 'Decrement' }));

    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
