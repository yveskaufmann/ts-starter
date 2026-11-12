<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import { API_BASE_URL } from '@/lib/api-client';

import { useHealth } from '../api/health';

const { data, error, isPending, isFetching, refetch } = useHealth();
</script>

<template>
  <BaseCard title="API example">
    <p class="mb-4">
      Calls <code class="rounded bg-slate-100 px-1 dark:bg-slate-800">GET {{ API_BASE_URL }}/health</code> with TanStack
      Query.
    </p>
    <p v-if="isPending">Loading...</p>
    <p v-else-if="error" class="text-amber-700 dark:text-amber-400">
      No backend answered: {{ error.message }}. Start your backend or set API_PROXY_TARGET in .env.local.
    </p>
    <p v-else class="text-emerald-700 dark:text-emerald-400">Backend status: {{ data?.status }}</p>
    <BaseButton variant="secondary" class="mt-4" :disabled="isFetching" @click="refetch()">
      {{ isFetching ? 'Checking...' : 'Check again' }}
    </BaseButton>
  </BaseCard>
</template>
