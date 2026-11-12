<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue';
import CounterCard from '@/features/counter/components/CounterCard.vue';
import HealthStatus from '@/features/health/components/HealthStatus.vue';
</script>

<template>
  <div class="space-y-8">
    <div>
      <h1 class="font-bold text-3xl tracking-tight">Welcome</h1>
      <p class="mt-2 text-slate-600 dark:text-slate-400">
        Edit <code>src/pages/HomePage.vue</code> and save, the page updates without a reload.
      </p>
    </div>

    <div class="grid gap-6 md:grid-cols-2">
      <CounterCard />
      <HealthStatus />
      <BaseCard title="Tailwind example">
        <p>Utility classes, responsive (md:), dark mode (dark:) and an own color from styles/app.css:</p>
        <div class="mt-4 flex flex-wrap gap-2">
          <span class="rounded-full bg-brand-50 px-3 py-1 text-brand-700 text-xs">brand-50</span>
          <span class="rounded-full bg-brand-500 px-3 py-1 text-white text-xs">brand-500</span>
          <span class="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800 text-xs">emerald-100</span>
        </div>
      </BaseCard>
    </div>
  </div>
</template>
