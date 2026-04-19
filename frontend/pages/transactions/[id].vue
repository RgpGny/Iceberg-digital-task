<script setup lang="ts">
import { STAGE_LABELS, formatMoney } from '~/types';
import { useTransactionsStore } from '~/stores/transactions';
import { useAgentsStore } from '~/stores/agents';

const route = useRoute();
const id = route.params.id as string;

const transactionsStore = useTransactionsStore();
const agentsStore = useAgentsStore();

async function load() {
  await Promise.all([
    transactionsStore.fetchOne(id),
    transactionsStore.fetchBreakdown(id),
    agentsStore.agents.length === 0 ? agentsStore.fetchAll() : Promise.resolve(),
  ]);
}

onMounted(load);

async function onTransitioned() {
  await Promise.all([transactionsStore.fetchOne(id), transactionsStore.fetchBreakdown(id)]);
}

const tx = computed(() => transactionsStore.current);
const breakdown = computed(() => transactionsStore.breakdown);

function agentName(agentId: string): string {
  return agentsStore.agents.find((a) => a.id === agentId)?.name ?? agentId;
}

const stagePillClass: Record<string, string> = {
  agreement: 'pill-agreement',
  earnest_money: 'pill-earnest',
  title_deed: 'pill-title_deed',
  completed: 'pill-completed',
};
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <button class="btn btn-ghost btn-sm" @click="navigateTo('/')">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M9 11L5 7l4-4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        All Transactions
      </button>
      <div>
        <p class="page-eyebrow" style="margin-bottom: 4px">Transaction Detail</p>
        <h1 v-if="tx" class="f-display-italic" style="font-size: 1.75rem; margin: 0">
          {{ tx.property.address }}
        </h1>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="transactionsStore.loading && !tx" class="text-center py-20">
      <p class="f-display-italic" style="font-size: 1.1rem; color: var(--color-text-3)">Loading…</p>
    </div>

    <!-- Error -->
    <div v-else-if="transactionsStore.error" class="error-banner">
      {{ transactionsStore.error }}
    </div>

    <template v-else-if="tx">
      <!-- Top row: Property + Stage -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <!-- Property info -->
        <div class="card">
          <div class="card-head">
            <span class="label">Property Information</span>
            <span class="pill" :class="stagePillClass[tx.stage]">
              <span class="pill-dot" />
              {{ STAGE_LABELS[tx.stage] }}
            </span>
          </div>
          <div class="card-body space-y-4">
            <div>
              <p class="detail-key">Address</p>
              <p class="detail-val" style="font-weight: 500">{{ tx.property.address }}</p>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="detail-key">Type</p>
                <p class="detail-val">{{ tx.property.type === 'sale' ? 'Sale' : 'Rental' }}</p>
              </div>
              <div v-if="tx.completedAt">
                <p class="detail-key">Completed</p>
                <p class="detail-val">
                  {{ new Date(tx.completedAt).toLocaleDateString('en-GB') }}
                </p>
              </div>
            </div>
            <div
              style="
                background: var(--color-surface-2);
                border-radius: var(--radius-md);
                padding: 12px 14px;
              "
            >
              <p class="detail-key" style="margin-bottom: 2px">List Price</p>
              <p class="money-lg" style="font-size: 1.4rem">
                {{ formatMoney(tx.property.listPrice) }}
              </p>
            </div>
            <div
              style="
                background: var(--accent-glow-2);
                border: 1px solid var(--accent-border);
                border-radius: var(--radius-md);
                padding: 12px 14px;
              "
            >
              <p class="detail-key" style="margin-bottom: 2px; color: var(--color-accent-dim)">
                Service Fee
              </p>
              <p class="money-xl" style="font-size: 1.4rem">{{ formatMoney(tx.serviceFee) }}</p>
            </div>
          </div>
        </div>

        <!-- Agents + Stage -->
        <div class="space-y-5">
          <!-- Agents -->
          <div class="card">
            <div class="card-head">
              <span class="label">Agents</span>
            </div>
            <div class="card-body space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <p class="detail-key">Listing Agent</p>
                  <p class="detail-val" style="font-weight: 500">
                    {{ agentName(tx.listingAgentId) }}
                  </p>
                </div>
                <div class="avatar">{{ agentName(tx.listingAgentId).charAt(0) }}</div>
              </div>
              <div style="border-top: 1px solid var(--color-border)" />
              <div class="flex items-center justify-between">
                <div>
                  <p class="detail-key">Selling Agent</p>
                  <p class="detail-val" style="font-weight: 500">
                    {{ agentName(tx.sellingAgentId) }}
                  </p>
                </div>
                <div class="avatar">{{ agentName(tx.sellingAgentId).charAt(0) }}</div>
              </div>
            </div>
          </div>

          <!-- Transition button -->
          <div v-if="tx.stage !== 'completed'" class="card card-body">
            <TransitionButton
              :transaction-id="tx.id"
              :current-stage="tx.stage"
              @transitioned="onTransitioned"
            />
          </div>
        </div>
      </div>

      <!-- Stage timeline -->
      <div class="card">
        <div class="card-head">
          <span class="label">Stage Status</span>
        </div>
        <div class="card-body">
          <StageTimeline :stage="tx.stage" :stage-history="tx.stageHistory" />
        </div>
      </div>

      <!-- History log -->
      <div v-if="tx.stageHistory.length > 0" class="card">
        <div class="card-head">
          <span class="label">History</span>
        </div>
        <div class="card-body space-y-0">
          <div v-for="(entry, i) in [...tx.stageHistory].reverse()" :key="i" class="log-entry">
            <div class="log-dot" />
            <div class="flex-1">
              <p style="font-size: 0.875rem">
                <template v-if="entry.from">
                  <span style="color: var(--color-text-2)">{{ STAGE_LABELS[entry.from] }}</span>
                  <span style="color: var(--color-text-3); margin: 0 6px">→</span>
                  <span style="font-weight: 500">{{ STAGE_LABELS[entry.to] }}</span>
                </template>
                <template v-else>
                  <span style="color: var(--color-text-2)">Started:</span>
                  <span style="font-weight: 500; margin-left: 4px">{{
                    STAGE_LABELS[entry.to]
                  }}</span>
                </template>
              </p>
              <p
                v-if="entry.note"
                class="f-display-italic"
                style="font-size: 0.8rem; color: var(--color-accent-dim); margin-top: 2px"
              >
                "{{ entry.note }}"
              </p>
            </div>
            <span
              class="f-mono"
              style="font-size: 0.72rem; color: var(--color-text-3); white-space: nowrap"
            >
              {{
                new Date(entry.at).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              }}
            </span>
          </div>
        </div>
      </div>

      <!-- Commission breakdown -->
      <CommissionBreakdownCard
        v-if="breakdown"
        :breakdown="breakdown"
        :agents="agentsStore.agents"
      />
    </template>
  </div>
</template>
