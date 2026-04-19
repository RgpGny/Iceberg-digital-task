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
  return new Date(entry.at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
}

function stageStatus(s: Stage): 'completed' | 'current' | 'upcoming' {
  const idx = STAGE_ORDER.indexOf(s);
  if (idx < currentIndex.value) return 'completed';
  if (idx === currentIndex.value) return 'current';
  return 'upcoming';
}
</script>

<template>
  <div class="flex items-start w-full overflow-x-auto py-1">
    <template v-for="(s, idx) in STAGE_ORDER" :key="s">
      <div class="flex flex-col items-center" style="min-width: 80px">
        <!-- Dot -->
        <div class="timeline-dot" :class="stageStatus(s)">
          <template v-if="stageStatus(s) === 'completed'">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path
                d="M2.5 6.5l2.5 2.5 5-5"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </template>
          <template v-else>
            <span style="font-size: 11px; font-weight: 600">{{ idx + 1 }}</span>
          </template>
        </div>

        <!-- Label -->
        <span
          style="
            margin-top: 8px;
            font-size: 10px;
            text-align: center;
            font-weight: 600;
            letter-spacing: 0.06em;
            text-transform: uppercase;
          "
          :style="{
            color:
              stageStatus(s) === 'completed'
                ? 'var(--color-stage-completed)'
                : stageStatus(s) === 'current'
                  ? 'var(--color-accent-light)'
                  : 'var(--color-text-3)',
          }"
        >
          {{ STAGE_LABELS[s] }}
        </span>

        <!-- Date -->
        <span
          class="f-mono"
          style="font-size: 10px; color: var(--color-text-3); margin-top: 3px; text-align: center"
        >
          {{ getStageDate(s) ?? '' }}
        </span>
      </div>

      <!-- Connector -->
      <div
        v-if="idx < STAGE_ORDER.length - 1"
        class="timeline-line"
        :class="STAGE_ORDER.indexOf(s) < currentIndex ? 'done' : 'pending'"
        style="min-width: 24px"
      />
    </template>
  </div>
</template>
