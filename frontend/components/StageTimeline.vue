<script setup lang="ts">
import type { Stage, StageHistoryEntry } from '~/types';
import { STAGE_LABELS, STAGE_ORDER } from '~/types';

const props = defineProps<{
  stage: Stage;
  stageHistory: StageHistoryEntry[];
}>();

const currentIndex = computed(() => STAGE_ORDER.indexOf(props.stage));

function getStageDate(s: Stage): string | null {
  const entry = props.stageHistory.find((h) => h.to === s);
  if (!entry) return null;
  return new Date(entry.at).toLocaleDateString('tr-TR');
}

function stageStatus(s: Stage): 'completed' | 'current' | 'upcoming' {
  const idx = STAGE_ORDER.indexOf(s);
  if (idx < currentIndex.value) return 'completed';
  if (idx === currentIndex.value) return 'current';
  return 'upcoming';
}
</script>

<template>
  <div class="flex items-start w-full overflow-x-auto py-2">
    <template v-for="(s, idx) in STAGE_ORDER" :key="s">
      <div class="flex flex-col items-center min-w-[80px]">
        <!-- Circle -->
        <div
          class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all"
          :class="{
            'bg-green-500 border-green-500 text-white': stageStatus(s) === 'completed',
            'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100':
              stageStatus(s) === 'current',
            'bg-white border-gray-300 text-gray-400': stageStatus(s) === 'upcoming',
          }"
        >
          <template v-if="stageStatus(s) === 'completed'">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="3"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </template>
          <template v-else>
            {{ idx + 1 }}
          </template>
        </div>

        <!-- Label -->
        <span
          class="mt-2 text-xs text-center font-medium"
          :class="{
            'text-green-600': stageStatus(s) === 'completed',
            'text-blue-700': stageStatus(s) === 'current',
            'text-gray-400': stageStatus(s) === 'upcoming',
          }"
        >
          {{ STAGE_LABELS[s] }}
        </span>

        <!-- Date -->
        <span class="mt-1 text-xs text-gray-400 text-center">
          {{ getStageDate(s) ?? '' }}
        </span>
      </div>

      <!-- Connector line (not after the last item) -->
      <div
        v-if="idx < STAGE_ORDER.length - 1"
        class="flex-1 h-0.5 mt-4 mx-1 min-w-[24px] transition-all"
        :class="{
          'bg-green-400': STAGE_ORDER.indexOf(s) < currentIndex,
          'bg-gray-200': STAGE_ORDER.indexOf(s) >= currentIndex,
        }"
      />
    </template>
  </div>
</template>
