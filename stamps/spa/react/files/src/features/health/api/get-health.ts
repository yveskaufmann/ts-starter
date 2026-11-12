import { queryOptions, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';

/** What the backend answers on GET /api/health. Adjust it to your backend. */
export type Health = {
  status: string;
};

/**
 * The query key and function in one place: usable in components (useHealth) and in route loaders
 * (queryClient.ensureQueryData(healthQueryOptions())).
 */
export const healthQueryOptions = () =>
  queryOptions({
    queryKey: ['health'],
    queryFn: ({ signal }) => api.get<Health>('/health', { signal }),
    retry: false,
  });

export function useHealth() {
  return useQuery(healthQueryOptions());
}
