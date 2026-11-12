<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue';
import { APP_NAME } from '@/config';
import { useThemeStore } from '@/stores/theme';

const themeStore = useThemeStore();

const navigation = [
  { to: '/', label: 'Home' },
  { to: '/items', label: 'Items' },
  { to: '/about', label: 'About' },
];
</script>

<!-- The frame around every page: header with navigation, the page itself (slot) and a footer -->
<template>
  <div class="flex min-h-screen flex-col">
    <header class="border-slate-200 border-b dark:border-slate-800">
      <nav class="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
        <span class="font-bold text-brand-600">{{ APP_NAME }}</span>
        <RouterLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          class="text-slate-600 text-sm hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          :exact-active-class="item.to === '/' ? 'font-semibold text-slate-900 dark:text-white' : undefined"
          :active-class="item.to === '/' ? undefined : 'font-semibold text-slate-900 dark:text-white'"
        >
          {{ item.label }}
        </RouterLink>
        <BaseButton variant="ghost" class="ml-auto" @click="themeStore.toggleTheme()">
          {{ themeStore.theme === 'light' ? 'Dark mode' : 'Light mode' }}
        </BaseButton>
      </nav>
    </header>

    <main class="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <slot />
    </main>

    <footer class="border-slate-200 border-t py-4 text-center text-slate-500 text-xs dark:border-slate-800">
      Built with Vite, Vue and Tailwind CSS
    </footer>
  </div>
</template>
