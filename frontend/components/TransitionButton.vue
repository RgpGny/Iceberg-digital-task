<script setup lang="ts">
import type { Stage } from '~/types';
import { STAGE_LABELS, nextStage } from '~/types';

const props = defineProps<{
  transactionId: string;
  currentStage: Stage;
}>();

const emit = defineEmits<{
  transitioned: [];
}>();

const transactionsStore = useTransactionsStore();

const next = computed(() => nextStage(props.currentStage));
const loading = ref(false);
const note = ref('');
const showNoteInput = ref(false);

async function handleTransition() {
  if (!next.value) return;
  if (!showNoteInput.value) {
    showNoteInput.value = true;
    return;
  }
  loading.value = true;
  try {
    await transactionsStore.transition(props.transactionId, next.value, note.value || undefined);
    note.value = '';
    showNoteInput.value = false;
    emit('transitioned');
  } finally {
    loading.value = false;
  }
}

function cancel() {
  note.value = '';
  showNoteInput.value = false;
}
</script>

<template>
  <div v-if="next" class="flex flex-col gap-2">
    <div v-if="showNoteInput" class="flex flex-col gap-2">
      <UFormField label="Not (isteğe bağlı)">
        <UInput v-model="note" placeholder="Aşama geçişi için not ekleyin..." class="w-full" />
      </UFormField>
      <div class="flex gap-2">
        <UButton color="primary" :loading="loading" @click="handleTransition">
          {{ STAGE_LABELS[next] }} Aşamasına İlerlet
        </UButton>
        <UButton color="neutral" variant="outline" :disabled="loading" @click="cancel">
          İptal
        </UButton>
      </div>
    </div>
    <div v-else>
      <UButton color="primary" :loading="loading" @click="handleTransition">
        {{ STAGE_LABELS[next] }} Aşamasına İlerlet
      </UButton>
    </div>
  </div>
</template>
