<script setup lang="ts">
const variants = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  secondary:
    'bg-white text-slate-900 ring-1 ring-slate-300 ring-inset hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-800',
  ghost: 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
};

const { variant = 'primary', type = 'button' } = defineProps<{
  variant?: keyof typeof variants;
  type?: 'button' | 'submit' | 'reset';
}>();
</script>

<template>
  <!-- Attributes like @click, disabled or class are passed on to the <button> -->
  <button
    :type="type"
    :class="[
      'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-medium text-sm transition-colors focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50',
      variants[variant],
    ]"
  >
    <slot />
  </button>
</template>
