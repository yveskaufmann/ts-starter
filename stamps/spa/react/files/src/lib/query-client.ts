import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data counts as fresh for 30 seconds, then it is fetched again in the background when used
      staleTime: 30_000,
      retry: 1,
    },
  },
});
