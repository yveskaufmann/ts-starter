import { defineStore } from 'pinia';
import { ref } from 'vue';

/** State of one feature. The actions are plain functions next to the state. */
export const useCounterStore = defineStore('counter', () => {
  const count = ref(0);

  function increment() {
    count.value++;
  }
  function decrement() {
    count.value--;
  }
  function reset() {
    count.value = 0;
  }

  return { count, increment, decrement, reset };
});
