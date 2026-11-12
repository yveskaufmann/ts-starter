import { createFileRoute } from '@tanstack/react-router';

import { Card } from '@/components/ui/card';
import { Counter } from '@/features/counter/components/counter';
import { HealthStatus } from '@/features/health/components/health-status';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Welcome</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Edit <code>src/routes/index.tsx</code> and save, the page updates without a reload.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Counter />
        <HealthStatus />
        <Card title="Tailwind example">
          <p>Utility classes, responsive (md:), dark mode (dark:) and an own color from styles/app.css:</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-brand-50 px-3 py-1 text-brand-700 text-xs">brand-50</span>
            <span className="rounded-full bg-brand-500 px-3 py-1 text-white text-xs">brand-500</span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800 text-xs">emerald-100</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
