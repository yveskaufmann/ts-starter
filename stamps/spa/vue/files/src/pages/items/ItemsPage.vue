<script setup lang="ts">
import { items } from './items';
</script>

<template>
  <div class="space-y-4">
    <h1 class="font-bold text-3xl">Items</h1>
    <p class="text-slate-600 dark:text-slate-400">A list that links to a route with a parameter.</p>
    <ul
      class="divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800"
    >
      <li v-for="item in items" :key="item.id">
        <RouterLink
          :to="{ name: 'item', params: { itemId: item.id } }"
          class="block px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900"
        >
          {{ item.name }}
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
