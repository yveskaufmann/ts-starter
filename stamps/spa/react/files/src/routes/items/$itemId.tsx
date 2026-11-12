import { createFileRoute, Link, notFound } from '@tanstack/react-router';

import { items } from './-data';

export const Route = createFileRoute('/items/$itemId')({
  // A loader runs before the page is shown. With a backend use
  // context.queryClient.ensureQueryData(...) here, see features/health/api.
  loader: ({ params }) => {
    const item = items.find((candidate) => candidate.id === params.itemId);
    if (!item) {
      throw notFound();
    }
    return item;
  },
  component: ItemPage,
});

function ItemPage() {
  const item = Route.useLoaderData();

  return (
    <div className="space-y-4">
      <Link to="/items" className="text-brand-600 text-sm underline">
        All items
      </Link>
      <h1 className="font-bold text-3xl">{item.name}</h1>
      <p>{item.description}</p>
    </div>
  );
}
