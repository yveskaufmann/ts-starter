import { VueQueryPlugin } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from '@/App.vue';
import { queryClient } from '@/lib/query-client';
import { router } from '@/router';
import '@/styles/app.css';

createApp(App).use(createPinia()).use(router).use(VueQueryPlugin, { queryClient }).mount('#app');
