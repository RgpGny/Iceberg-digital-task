<script setup lang="ts">
import type { Agent, CommissionBreakdown } from '~/types';
import { formatMoney } from '~/types';

const props = defineProps<{
  breakdown: CommissionBreakdown;
  agents: Agent[];
}>();

function agentName(agentId: string): string {
  return props.agents.find((a) => a.id === agentId)?.name ?? agentId;
}

const roleLabels: Record<string, string> = {
  listing: 'Satışa Çıkaran',
  selling: 'Satan',
  dual: 'Çift Rol',
};

const scenarioLabels: Record<string, string> = {
  same_agent: 'Aynı Ajan',
  different_agents: 'Farklı Ajanlar',
};
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold">Komisyon Dağılımı</h3>
        <UBadge color="primary" variant="soft">
          {{ scenarioLabels[breakdown.scenario] }}
        </UBadge>
      </div>
    </template>

    <div class="space-y-4">
      <!-- Totals row -->
      <div class="grid grid-cols-2 gap-4">
        <div class="rounded-lg bg-gray-50 p-3">
          <p class="text-xs text-gray-500 mb-1">Toplam Hizmet Bedeli</p>
          <p class="text-lg font-bold text-gray-900">
            {{ formatMoney(breakdown.totalFee) }}
          </p>
        </div>
        <div class="rounded-lg bg-gray-50 p-3">
          <p class="text-xs text-gray-500 mb-1">Acenta Payı (%50)</p>
          <p class="text-lg font-bold text-gray-900">
            {{ formatMoney(breakdown.agencyShare) }}
          </p>
        </div>
      </div>

      <!-- Agent shares -->
      <div>
        <p class="text-sm font-medium text-gray-700 mb-2">Ajan Payları</p>
        <div class="space-y-2">
          <div
            v-for="share in breakdown.agentShares"
            :key="share.agentId"
            class="flex items-start justify-between rounded-lg border border-gray-100 p-3"
          >
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">
                {{ agentName(share.agentId) }}
              </p>
              <p class="text-xs text-gray-500 mt-0.5">
                {{ roleLabels[share.role] ?? share.role }}
              </p>
              <p class="text-xs text-gray-400 mt-1 italic">{{ share.rationale }}</p>
            </div>
            <div class="ml-4 text-right shrink-0">
              <p class="text-sm font-semibold text-gray-900">
                {{ formatMoney(share.amount) }}
              </p>
              <p class="text-xs text-gray-500">%{{ share.percentage }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <p class="text-xs text-gray-400">
        Hesaplandı:
        {{ new Date(breakdown.computedAt).toLocaleString('tr-TR') }}
      </p>
    </template>
  </UCard>
</template>
