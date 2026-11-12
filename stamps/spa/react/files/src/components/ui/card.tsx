import type { ReactNode } from 'react';

type CardProps = {
  title: string;
  children: ReactNode;
};

export function Card({ title, children }: CardProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 font-semibold text-lg">{title}</h2>
      <div className="text-slate-600 text-sm dark:text-slate-400">{children}</div>
    </section>
  );
}
