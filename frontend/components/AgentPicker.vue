<script setup lang="ts">
import { useAgentsStore } from '~/stores/agents';

const props = defineProps<{
  modelValue: string;
  label: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const agentsStore = useAgentsStore();

onMounted(async () => {
  if (agentsStore.agents.length === 0) {
    await agentsStore.fetchAll();
  }
});

const items = computed(() => agentsStore.agents.map((a) => ({ label: a.name, value: a.id })));

const selected = computed({
  get: () => props.modelValue,
  set: (val: string) => emit('update:modelValue', val),
});
</script>

<template>
  <UFormField :label="label">
    <USelect v-model="selected" :items="items" placeholder="Ajan seçin..." class="w-full" />
  </UFormField>
</template>
