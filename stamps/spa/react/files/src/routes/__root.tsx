import type { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createRootRouteWithContext } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

import { AppLayout } from '@/components/layout/app-layout';
import { NotFound } from '@/components/layout/not-found';

/** What every route gets in its loader as `context`, set in src/router.tsx */
export type RouterContext = {
  queryClient: QueryClient;
};

// The root route is the layout of all pages. The devtools are only part of the dev build.
export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <>
      <AppLayout />
      <ReactQueryDevtools buttonPosition="bottom-left" />
      <TanStackRouterDevtools position="bottom-right" />
    </>
  ),
  notFoundComponent: NotFound,
});
