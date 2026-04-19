<script setup lang="ts">
import type { Stage } from '~/types';
import { STAGE_LABELS, nextStage } from '~/types';

const props = defineProps<{
  transactionId: string;
  currentStage: Stage;
}>();

const emit = defineEmits<{ transitioned: [] }>();

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
  <div v-if="next" class="space-y-3">
    <div v-if="showNoteInput" class="space-y-3">
      <div>
        <label class="field-label">Note (optional)</label>
        <input v-model="note" class="input" placeholder="Add a note for stage transition…" />
      </div>
      <div class="flex items-center gap-2">
        <button class="btn btn-primary" :disabled="loading" @click="handleTransition">
          {{ loading ? 'Processing…' : `Advance to ${STAGE_LABELS[next]}` }}
        </button>
        <button class="btn btn-ghost" :disabled="loading" @click="cancel">Cancel</button>
      </div>
    </div>
    <div v-else>
      <button class="btn btn-primary" @click="handleTransition">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M2 7h10M8 3l4 4-4 4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        Advance to {{ STAGE_LABELS[next] }}
      </button>
    </div>
  </div>
</template>
