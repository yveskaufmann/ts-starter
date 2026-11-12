import { createRouter } from '@tanstack/react-router';

import { queryClient } from '@/lib/query-client';
import { routeTree } from '@/routeTree.gen';

export const router = createRouter({
  routeTree,
  // Same base path as Vite (BASE_PATH), so the app works under a sub path like /app/
  basepath: import.meta.env.BASE_URL,
  context: { queryClient },
  // Load the code and data of a route when the user hovers a link to it
  defaultPreload: 'intent',
  // TanStack Query caches the data, the router does not need to cache it again
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
});

// Makes Link, useParams, ... type safe for the routes of this app
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
