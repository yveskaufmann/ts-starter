import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderRoute } from '@/test/render';

describe('routes', () => {
  it('shows an item', async () => {
    renderRoute('/items/1');

    expect(await screen.findByRole('heading', { name: 'First item' })).toBeInTheDocument();
  });

  it('navigates from the list to an item', async () => {
    const { user } = renderRoute('/items');

    await user.click(await screen.findByRole('link', { name: 'Second item' }));

    expect(await screen.findByRole('heading', { name: 'Second item' })).toBeInTheDocument();
  });

  it('shows the not found page for unknown items', async () => {
    renderRoute('/items/unknown');

    expect(await screen.findByText('Page not found')).toBeInTheDocument();
  });
});
