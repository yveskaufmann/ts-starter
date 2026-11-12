<script setup lang="ts">
import { storeToRefs } from 'pinia';

import BaseButton from '@/components/ui/BaseButton.vue';
import BaseCard from '@/components/ui/BaseCard.vue';

import { useCounterStore } from '../stores/counter';

const counter = useCounterStore();
// storeToRefs keeps the state reactive when it is destructured, actions can be used directly
const { count } = storeToRefs(counter);
const { increment, decrement } = counter;
</script>

<template>
  <BaseCard title="State example">
    <p class="mb-4">A Pinia store. The count is kept when you switch pages.</p>
    <div class="flex items-center gap-3">
      <BaseButton variant="secondary" aria-label="Decrement" @click="decrement">-</BaseButton>
      <span class="w-12 text-center font-mono text-2xl text-slate-900 dark:text-white">{{ count }}</span>
      <BaseButton variant="secondary" aria-label="Increment" @click="increment">+</BaseButton>
    </div>
  </BaseCard>
</template>
