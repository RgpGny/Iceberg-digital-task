<script setup lang="ts">
import type { Stage } from '~/types';
import { STAGE_LABELS, STAGE_ORDER, formatMoney } from '~/types';
import { useTransactionsStore } from '~/stores/transactions';

const transactionsStore = useTransactionsStore();
const activeFilter = ref<Stage | ''>('');

const stageFilters = [
  { label: 'Tümü', value: '' as Stage | '' },
  ...STAGE_ORDER.map((s) => ({ label: STAGE_LABELS[s], value: s as Stage | '' })),
];

async function applyFilter(val: Stage | '') {
  activeFilter.value = val;
  await transactionsStore.fetchAll(val || undefined);
}

onMounted(() => transactionsStore.fetchAll());

const stats = computed(() =>
  STAGE_ORDER.map((s) => ({
    stage: s,
    label: STAGE_LABELS[s],
    count: transactionsStore.list.filter((t) => t.stage === s).length,
  })),
);

const stageClass: Record<Stage, string> = {
  agreement: 'pill-agreement',
  earnest_money: 'pill-earnest',
  title_deed: 'pill-title_deed',
  completed: 'pill-completed',
};
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 py-10 space-y-8">
    <!-- Page header -->
    <div class="flex items-end justify-between">
      <div>
        <p class="page-eyebrow">Real Estate Platform</p>
        <h1 class="page-title">
          Real Estate
          <span :style="{ color: 'var(--color-accent-light)' }">Transactions</span>
        </h1>
      </div>
      <p style="font-size: 0.8rem; color: var(--color-text-3)">
        {{
          new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        }}
      </p>
    </div>

    <!-- Stats row -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div
        v-for="s in stats"
        :key="s.stage"
        class="stat-card cursor-pointer"
        @click="applyFilter(s.stage as Stage)"
      >
        <div class="stat-number">{{ s.count }}</div>
        <div class="stat-label">{{ s.label }}</div>
        <div
          class="mt-3 h-px"
          :style="`background:var(--stage-${s.stage === 'earnest_money' ? 'earnest' : s.stage === 'title_deed' ? 'title' : s.stage === 'completed' ? 'done' : 'agreement'});opacity:0.3`"
        />
      </div>
    </div>

    <!-- Filter row -->
    <div class="flex items-center gap-2 flex-wrap">
      <button
        v-for="f in stageFilters"
        :key="f.value"
        class="filter-pill"
        :class="{ active: activeFilter === f.value }"
        @click="applyFilter(f.value)"
      >
        {{ f.label }}
      </button>
    </div>

    <!-- Error -->
    <div v-if="transactionsStore.error" class="error-banner">
      {{ transactionsStore.error }}
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <!-- Loading -->
      <div v-if="transactionsStore.loading" class="card-body text-center py-16">
        <p class="f-display-italic" style="font-size: 1.1rem; color: var(--color-text-2)">
          Loading…
        </p>
      </div>

      <table v-else class="table">
        <thead>
          <tr>
            <th>Property</th>
            <th>Type</th>
            <th>Service Fee</th>
            <th>Stage</th>
            <th>Date</th>
            <th style="width: 80px" />
          </tr>
        </thead>
        <tbody>
          <!-- Empty state -->
          <tr v-if="transactionsStore.list.length === 0">
            <td colspan="6" class="text-center py-16">
              <p class="f-display-italic" style="font-size: 1.1rem; color: var(--color-text-3)">
                No records found
              </p>
              <p style="font-size: 0.8rem; color: var(--color-text-3); margin-top: 6px">
                Click the "New Transaction" button in the left menu to create your first
                transaction.
              </p>
            </td>
          </tr>

          <tr
            v-for="tx in transactionsStore.list"
            :key="tx.id"
            @click="navigateTo(`/transactions/${tx.id}`)"
          >
            <td data-label="Property">
              <span style="font-weight: 500">{{ tx.property.address }}</span>
            </td>
            <td data-label="Type" style="color: var(--color-text-2)">
              {{ tx.property.type === 'sale' ? 'Sale' : 'Rental' }}
            </td>
            <td data-label="Service Fee">
              <span class="money-sm">{{ formatMoney(tx.serviceFee) }}</span>
            </td>
            <td data-label="Stage">
              <span class="pill" :class="stageClass[tx.stage]">
                <span class="pill-dot" />
                {{ STAGE_LABELS[tx.stage] }}
              </span>
            </td>
            <td data-label="Date" style="color: var(--color-text-3); font-size: 0.8rem">
              {{ new Date(tx.createdAt).toLocaleDateString('en-GB') }}
            </td>
            <td data-label="">
              <button
                class="btn btn-ghost btn-sm"
                @click.stop="navigateTo(`/transactions/${tx.id}`)"
              >
                View
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
