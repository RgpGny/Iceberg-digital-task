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
  <div class="max-w-5xl mx-auto space-y-8">
    <!-- Header -->
    <div>
      <p class="page-eyebrow">Finansal Analiz</p>
      <h1 class="page-title">
        Kazanç
        <span style="color: var(--color-accent-light)">Raporu</span>
      </h1>
    </div>

    <!-- Filters -->
    <div class="card">
      <div class="card-head">
        <span class="label">Filtreler</span>
      </div>
      <div class="card-body">
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label for="filter-agent" class="field-label">Ajan</label>
            <select id="filter-agent" v-model="filters.agentId" class="select">
              <option value="__all__">Tüm Ajanlar</option>
              <option v-for="a in agentsStore.agents" :key="a.id" :value="a.id">
                {{ a.name }}
              </option>
            </select>
          </div>
          <div>
            <label for="filter-from" class="field-label">Başlangıç Tarihi</label>
            <input id="filter-from" v-model="filters.from" type="date" class="input" />
          </div>
          <div>
            <label for="filter-to" class="field-label">Bitiş Tarihi</label>
            <input id="filter-to" v-model="filters.to" type="date" class="input" />
          </div>
          <div>
            <button
              class="btn btn-primary btn-block"
              :disabled="reportsStore.loading"
              @click="applyFilters"
            >
              {{ reportsStore.loading ? 'Hesaplanıyor…' : 'Raporu Getir' }}
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
              Acenta Geliri
            </p>
            <p class="money-xl" style="font-size: 2.2rem">
              {{ formatMoney(reportsStore.report.agencyTotal) }}
            </p>
            <p style="font-size: 0.75rem; color: var(--color-text-3); margin-top: 6px">
              Tamamlanan işlemlerden elde edilen toplam acenta payı
            </p>
          </div>
        </div>

        <!-- Agent count -->
        <div class="card">
          <div class="card-body">
            <p class="label" style="margin-bottom: 8px">Aktif Ajan</p>
            <p class="f-display" style="font-size: 2.2rem; color: var(--color-text)">
              {{ reportsStore.report.agents.length }}
            </p>
            <p style="font-size: 0.75rem; color: var(--color-text-3); margin-top: 6px">
              Bu dönemde komisyon kazanan ajan sayısı
            </p>
          </div>
        </div>
      </div>

      <!-- Agent earnings table -->
      <div class="card overflow-hidden">
        <div class="card-head">
          <span class="label">Ajan Bazlı Kazançlar</span>
        </div>

        <div v-if="reportsStore.report.agents.length === 0" class="card-body text-center py-12">
          <p class="f-display-italic" style="font-size: 1rem; color: var(--color-text-3)">
            Bu filtreye ait kazanç bulunamadı
          </p>
        </div>

        <table v-else class="table">
          <thead>
            <tr>
              <th>Ajan</th>
              <th style="text-align: center">İşlem Sayısı</th>
              <th style="text-align: right">Toplam Kazanç</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in reportsStore.report.agents" :key="row.agentId">
              <td data-label="Ajan">
                <div class="flex items-center gap-3">
                  <div class="avatar avatar-sm">{{ agentName(row.agentId).charAt(0) }}</div>
                  <span style="font-weight: 500">{{ agentName(row.agentId) }}</span>
                </div>
              </td>
              <td data-label="İşlem Sayısı" style="text-align: center">
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
              <td data-label="Toplam Kazanç" style="text-align: right">
                <span class="money-sm">{{ formatMoney(row.total) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
