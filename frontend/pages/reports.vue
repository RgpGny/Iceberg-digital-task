<script setup lang="ts">
import { formatMoney } from '~/types';
import { useReportsStore } from '~/stores/reports';
import { useAgentsStore } from '~/stores/agents';

const reportsStore = useReportsStore();
const agentsStore = useAgentsStore();

const filters = reactive({
  agentId: '__all__',
  from: '',
  to: '',
});

onMounted(async () => {
  if (agentsStore.agents.length === 0) await agentsStore.fetchAll();
  await reportsStore.fetchEarnings({});
});

async function applyFilters() {
  await reportsStore.fetchEarnings({
    agentId: filters.agentId && filters.agentId !== '__all__' ? filters.agentId : undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
  });
}

function agentName(agentId: string): string {
  return agentsStore.agents.find((a) => a.id === agentId)?.name ?? agentId;
}
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-8 px-4 sm:px-0">
    <!-- Header -->
    <div>
      <p class="page-eyebrow">Financial Analysis</p>
      <h1 class="page-title">
        Earnings
        <span style="color: var(--color-accent-light)">Report</span>
      </h1>
    </div>

    <!-- Filters -->
    <div class="card">
      <div class="card-head">
        <span class="label">Filters</span>
      </div>
      <div class="card-body">
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label for="filter-agent" class="field-label">Agent</label>
            <select id="filter-agent" v-model="filters.agentId" class="select">
              <option value="__all__">All Agents</option>
              <option v-for="a in agentsStore.agents" :key="a.id" :value="a.id">
                {{ a.name }}
              </option>
            </select>
          </div>
          <div>
            <label for="filter-from" class="field-label">Start Date</label>
            <input id="filter-from" v-model="filters.from" type="date" class="input" />
          </div>
          <div>
            <label for="filter-to" class="field-label">End Date</label>
            <input id="filter-to" v-model="filters.to" type="date" class="input" />
          </div>
          <div>
            <button
              class="btn btn-primary btn-block"
              :disabled="reportsStore.loading"
              @click="applyFilters"
            >
              {{ reportsStore.loading ? 'Calculating…' : 'Generate Report' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-if="reportsStore.error" class="error-banner">
      {{ reportsStore.error }}
    </div>

    <template v-if="reportsStore.report">
      <!-- Summary cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Agency total -->
        <div
          class="card"
          style="
            background: linear-gradient(
              135deg,
              var(--color-surface) 0%,
              var(--color-surface-2) 100%
            );
          "
        >
          <div class="card-body">
            <p class="label" style="color: var(--color-accent-dim); margin-bottom: 8px">
              Agency Revenue
            </p>
            <p class="money-xl" style="font-size: 2.2rem">
              {{ formatMoney(reportsStore.report.agencyTotal) }}
            </p>
            <p style="font-size: 0.75rem; color: var(--color-text-3); margin-top: 6px">
              Total agency share from completed transactions
            </p>
          </div>
        </div>

        <!-- Agent count -->
        <div class="card">
          <div class="card-body">
            <p class="label" style="margin-bottom: 8px">Active Agent</p>
            <p class="f-display" style="font-size: 2.2rem; color: var(--color-text)">
              {{ reportsStore.report.agents.length }}
            </p>
            <p style="font-size: 0.75rem; color: var(--color-text-3); margin-top: 6px">
              Number of agents earning commission in this period
            </p>
          </div>
        </div>
      </div>

      <!-- Agent earnings table -->
      <div class="card overflow-hidden">
        <div class="card-head">
          <span class="label">Agent Earnings</span>
        </div>

        <div v-if="reportsStore.report.agents.length === 0" class="card-body text-center py-12">
          <p class="f-display-italic" style="font-size: 1rem; color: var(--color-text-3)">
            No earnings found for this filter
          </p>
        </div>

        <table v-else class="table">
          <thead>
            <tr>
              <th>Agent</th>
              <th style="text-align: center">Transaction Count</th>
              <th style="text-align: right">Total Earnings</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in reportsStore.report.agents" :key="row.agentId">
              <td data-label="Agent">
                <div class="flex items-center gap-3">
                  <div class="avatar avatar-sm">{{ agentName(row.agentId).charAt(0) }}</div>
                  <span style="font-weight: 500">{{ agentName(row.agentId) }}</span>
                </div>
              </td>
              <td data-label="Transaction Count" style="text-align: center">
                <span
                  style="
                    display: inline-block;
                    background: var(--color-surface-2);
                    border: 1px solid var(--color-border);
                    border-radius: 999px;
                    padding: 2px 10px;
                    font-size: 0.8rem;
                    color: var(--color-text-2);
                  "
                >
                  {{ row.transactionCount }}
                </span>
              </td>
              <td data-label="Total Earnings" style="text-align: right">
                <span class="money-sm">{{ formatMoney(row.total) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
