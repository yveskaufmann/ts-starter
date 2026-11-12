import { QueryClient } from '@tanstack/react-query';
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { type RenderOptions, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';

import { AppProviders } from '@/providers';
import { routeTree } from '@/routeTree.gen';

/** A fresh QueryClient per test, without retries, so tests do not share cached data or wait for retries. */
export function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
}

/**
 * Render a component with the providers of the app (src/providers.tsx). Returns the Testing Library result plus a
 * `user` to click and type like a real user.
 */
export function renderWithProviders(ui: ReactElement, options: Omit<RenderOptions, 'wrapper'> = {}) {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppProviders queryClient={queryClient}>{children}</AppProviders>
  );
  return { user: userEvent.setup(), queryClient, ...render(ui, { wrapper, ...options }) };
}

/** Render the whole app at a path, with layout, loaders and the not found page. */
export function renderRoute(path: string) {
  const queryClient = createTestQueryClient();
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    context: { queryClient },
  });
  return {
    user: userEvent.setup(),
    router,
    ...render(
      <AppProviders queryClient={queryClient}>
        <RouterProvider router={router} />
      </AppProviders>,
    ),
  };
}
