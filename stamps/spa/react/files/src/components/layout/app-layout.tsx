import { Link, Outlet } from '@tanstack/react-router';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { APP_NAME } from '@/config';
import { useThemeStore } from '@/stores/theme-store';

const navigation = [
  { to: '/', label: 'Home' },
  { to: '/items', label: 'Items' },
  { to: '/about', label: 'About' },
] as const;

/** The frame around every page: header with navigation, the page itself and a footer. */
export function AppLayout() {
  const { theme, toggleTheme } = useThemeStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-slate-200 border-b dark:border-slate-800">
        <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <span className="font-bold text-brand-600">{APP_NAME}</span>
          {navigation.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-slate-600 text-sm hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              activeProps={{ className: 'font-semibold text-slate-900 dark:text-white' }}
              activeOptions={{ exact: item.to === '/' }}
            >
              {item.label}
            </Link>
          ))}
          <Button variant="ghost" className="ml-auto" onClick={toggleTheme}>
            {theme === 'light' ? 'Dark' : 'Light'} mode
          </Button>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-slate-200 border-t py-4 text-center text-slate-500 text-xs dark:border-slate-800">
        Built with Vite, React and Tailwind CSS
      </footer>
    </div>
  );
}
