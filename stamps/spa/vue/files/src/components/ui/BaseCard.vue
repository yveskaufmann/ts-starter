<script setup lang="ts">
defineProps<{ title: string }>();
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <h2 class="mb-3 font-semibold text-lg">{{ title }}</h2>
    <div class="text-slate-600 text-sm dark:text-slate-400"><slot /></div>
  </section>
</template>
