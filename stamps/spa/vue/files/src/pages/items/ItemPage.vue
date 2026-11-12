<script setup lang="ts">
import { computed } from 'vue';

import NotFoundPage from '@/pages/NotFoundPage.vue';

import { items } from './items';

// With a backend load the item with TanStack Query here, see features/health/api
const props = defineProps<{ itemId: string }>();
const item = computed(() => items.find((candidate) => candidate.id === props.itemId));
</script>

<template>
  <div v-if="item" class="space-y-4">
    <RouterLink to="/items" class="text-brand-600 text-sm underline">All items</RouterLink>
    <h1 class="font-bold text-3xl">{{ item.name }}</h1>
    <p>{{ item.description }}</p>
  </div>
  <NotFoundPage v-else />
</template>
