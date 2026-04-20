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
  listing: 'Listing Agent',
  selling: 'Selling Agent',
  dual: 'Dual Role',
};

const scenarioLabel = props.breakdown.scenario === 'same_agent' ? 'Same Agent' : 'Different Agents';
</script>

<template>
  <div class="card overflow-hidden">
    <!-- Header -->
    <div class="card-head">
      <span class="label">Commission Breakdown</span>
      <span
        class="pill"
        style="
          background: var(--accent-glow);
          border-color: var(--accent-border);
          color: var(--color-accent-light);
        "
      >
        <span class="pill-dot" />
        {{ scenarioLabel }}
      </span>
    </div>

    <div class="card-body space-y-5">
      <!-- Totals -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          style="background: var(--color-surface-2); border-radius: var(--radius-md); padding: 14px"
        >
          <p class="label" style="margin-bottom: 6px">Total Fee</p>
          <p class="money-sm" style="font-size: 1.2rem">
            {{ formatMoney(breakdown.totalFee) }}
          </p>
        </div>
        <div
          style="
            background: var(--accent-glow-2);
            border: 1px solid var(--accent-border);
            border-radius: var(--radius-md);
            padding: 14px;
          "
        >
          <p class="label" style="margin-bottom: 6px; color: var(--color-accent-dim)">
            Agency Share 50%
          </p>
          <p class="money-xl" style="font-size: 1.2rem">
            {{ formatMoney(breakdown.agencyShare) }}
          </p>
        </div>
      </div>

      <!-- Agent shares -->
      <div>
        <p class="label" style="margin-bottom: 10px">Agent Shares</p>
        <div>
          <div v-for="share in breakdown.agentShares" :key="share.agentId" class="breakdown-row">
            <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0">
              <div class="avatar">{{ agentName(share.agentId).charAt(0) }}</div>
              <div style="min-width: 0">
                <p style="font-weight: 500; font-size: 0.875rem">
                  {{ agentName(share.agentId) }}
                </p>
                <p style="font-size: 0.75rem; color: var(--color-text-3)">
                  {{ roleLabels[share.role] ?? share.role }}
                </p>
              </div>
            </div>
            <div style="text-align: right; flex-shrink: 0; margin-left: 16px">
              <p class="money-sm" style="font-size: 1rem">{{ formatMoney(share.amount) }}</p>
              <p style="font-size: 0.72rem; color: var(--color-text-3); margin-top: 2px">
                %{{ share.percentage }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card-foot" style="font-size: 0.72rem; color: var(--color-text-3)">
      Computed at: {{ new Date(breakdown.computedAt).toLocaleString('en-GB') }}
    </div>
  </div>
</template>
