<script setup lang="ts">
import { useAgentsStore } from '~/stores/agents';

defineProps<{
  modelValue: string;
  label: string;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const agentsStore = useAgentsStore();

onMounted(async () => {
  if (agentsStore.agents.length === 0) await agentsStore.fetchAll();
});
</script>

<template>
  <div>
    <label :for="`agent-${label}`" class="field-label">{{ label }}</label>
    <select
      :id="`agent-${label}`"
      :value="modelValue"
      class="select"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option value="" disabled>Select agent...</option>
      <option v-for="a in agentsStore.agents" :key="a.id" :value="a.id">{{ a.name }}</option>
    </select>
  </div>
</template>
