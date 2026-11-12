import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/about')({
  component: AboutPage,
});

function AboutPage() {
  return (
    <article className="max-w-2xl space-y-4">
      <h1 className="font-bold text-3xl">About</h1>
      <p>
        Every file in <code>src/routes</code> is a page. This one is <code>src/routes/about.tsx</code> and is shown at{' '}
        <code>/about</code>. Create a new file and the route is added to <code>src/routeTree.gen.ts</code> on save.
      </p>
    </article>
  );
}
