import { createFileRoute, Link } from '@tanstack/react-router';

import { items } from './-data';

export const Route = createFileRoute('/items/')({
  component: ItemsPage,
});

function ItemsPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-bold text-3xl">Items</h1>
      <p className="text-slate-600 dark:text-slate-400">A list that links to a route with a parameter.</p>
      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              to="/items/$itemId"
              params={{ itemId: item.id }}
              className="block px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
