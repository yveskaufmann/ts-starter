import { Link } from '@tanstack/react-router';

export function NotFound() {
  return (
    <div className="py-16 text-center">
      <p className="font-semibold text-brand-600">404</p>
      <h1 className="mt-2 font-bold text-3xl">Page not found</h1>
      <Link to="/" className="mt-6 inline-block text-brand-600 underline">
        Back to the start page
      </Link>
    </div>
  );
}
