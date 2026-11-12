import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { useCounterStore } from '../stores/counter-store';

export function Counter() {
  // Select only what the component needs, it then only renders again when that changes
  const count = useCounterStore((state) => state.count);
  const increment = useCounterStore((state) => state.increment);
  const decrement = useCounterStore((state) => state.decrement);

  return (
    <Card title="State example">
      <p className="mb-4">A Zustand store. The count is kept when you switch pages.</p>
      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={decrement} aria-label="Decrement">
          -
        </Button>
        <span className="w-12 text-center font-mono text-2xl text-slate-900 dark:text-white">{count}</span>
        <Button variant="secondary" onClick={increment} aria-label="Increment">
          +
        </Button>
      </div>
    </Card>
  );
}
