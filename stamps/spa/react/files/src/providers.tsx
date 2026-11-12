import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { queryClient as defaultQueryClient } from '@/lib/query-client';

type AppProvidersProps = {
  children: ReactNode;
  /** Tests pass their own client, so they do not share cached data */
  queryClient?: typeof defaultQueryClient;
};

/**
 * All app wide providers in one place, used by main.tsx and the test helpers. Add new global providers (i18n, theme,
 * feature flags, ...) here. A provider that only one feature needs belongs into that feature.
 */
export function AppProviders({ children, queryClient = defaultQueryClient }: AppProvidersProps) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
