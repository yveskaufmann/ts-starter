import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

import HomePage from '@/pages/HomePage.vue';

/** All pages of the app. Pages other than the start page are loaded on demand (one chunk per page). */
export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: HomePage },
  { path: '/about', name: 'about', component: () => import('@/pages/AboutPage.vue') },
  { path: '/items', name: 'items', component: () => import('@/pages/items/ItemsPage.vue') },
  {
    path: '/items/:itemId',
    name: 'item',
    component: () => import('@/pages/items/ItemPage.vue'),
    // The parameter is passed to the page as a prop
    props: true,
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/pages/NotFoundPage.vue') },
];

export const router = createRouter({
  // Same base path as Vite (BASE_PATH), so the app works under a sub path like /app/
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: (_to, _from, savedPosition) => savedPosition ?? { top: 0 },
});
