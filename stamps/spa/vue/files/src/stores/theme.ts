import { defineStore } from 'pinia';
import { ref, watchEffect } from 'vue';

export type Theme = 'light' | 'dark';

function savedTheme(): Theme {
  return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
}

/** Global UI state that survives a reload (saved in localStorage). Data from the API belongs in TanStack Query. */
export const useThemeStore = defineStore('theme', () => {
  const theme = ref<Theme>(savedTheme());

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light';
  }

  watchEffect(() => {
    localStorage.setItem('theme', theme.value);
    document.documentElement.classList.toggle('dark', theme.value === 'dark');
  });

  return { theme, toggleTheme };
});
