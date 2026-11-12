import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/render';

import { HealthStatus } from './health-status';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HealthStatus', () => {
  it('shows the status of the backend', async () => {
    // Replace the network: the component gets this answer instead of calling a backend
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ status: 'ok' })));

    renderWithProviders(<HealthStatus />);

    expect(await screen.findByText('Backend status: ok')).toBeInTheDocument();
  });

  it('explains what to do without a backend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    renderWithProviders(<HealthStatus />);

    expect(await screen.findByText(/No backend answered/)).toBeInTheDocument();
  });

  it('asks the backend again on click', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ status: 'ok' }));
    vi.stubGlobal('fetch', fetch);
    const { user } = renderWithProviders(<HealthStatus />);
    await screen.findByText('Backend status: ok');

    await user.click(screen.getByRole('button', { name: 'Check again' }));

    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });
});
