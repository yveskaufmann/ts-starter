import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { API_BASE_URL } from '@/lib/api-client';

import { useHealth } from '../api/get-health';

export function HealthStatus() {
  const { data, error, isPending, isFetching, refetch } = useHealth();

  return (
    <Card title="API example">
      <p className="mb-4">
        Calls <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">GET {API_BASE_URL}/health</code> with
        TanStack Query.
      </p>
      {isPending ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-amber-700 dark:text-amber-400">
          No backend answered: {error.message}. Start your backend or set API_PROXY_TARGET in .env.local.
        </p>
      ) : (
        <p className="text-emerald-700 dark:text-emerald-400">Backend status: {data.status}</p>
      )}
      <Button variant="secondary" className="mt-4" onClick={() => refetch()} disabled={isFetching}>
        {isFetching ? 'Checking...' : 'Check again'}
      </Button>
    </Card>
  );
}
