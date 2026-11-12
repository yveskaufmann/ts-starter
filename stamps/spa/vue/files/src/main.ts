import { createApp } from 'vue';

import App from '@/App.vue';
import { appPlugins } from '@/plugins';
import '@/styles/app.css';

createApp(App).use(appPlugins()).mount('#app');
