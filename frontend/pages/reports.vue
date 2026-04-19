<script setup lang="ts">
import { formatMoney } from '~/types';
import { useReportsStore } from '~/stores/reports';
import { useAgentsStore } from '~/stores/agents';

const reportsStore = useReportsStore();
const agentsStore = useAgentsStore();

const filters = reactive({
  agentId: '',
  from: '',
  to: '',
});

onMounted(async () => {
  if (agentsStore.agents.length === 0) await agentsStore.fetchAll();
  await reportsStore.fetchEarnings({});
});

async function applyFilters() {
  await reportsStore.fetchEarnings({
    agentId: filters.agentId || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
  });
}

function agentName(agentId: string): string {
  return agentsStore.agents.find((a) => a.id === agentId)?.name ?? agentId;
}

const agentFilterItems = computed(() => [
  { label: 'Tüm Ajanlar', value: '' },
  ...agentsStore.agents.map((a) => ({ label: a.name, value: a.id })),
]);
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8 space-y-6">
    <h1 class="text-2xl font-bold text-gray-900">Kazanç Raporu</h1>

    <!-- Filters -->
    <UCard>
      <template #header>
        <h2 class="text-base font-semibold">Filtreler</h2>
      </template>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <UFormField label="Ajan">
          <USelect v-model="filters.agentId" :items="agentFilterItems" class="w-full" />
        </UFormField>
        <UFormField label="Başlangıç Tarihi">
          <UInput v-model="filters.from" type="date" class="w-full" />
        </UFormField>
        <UFormField label="Bitiş Tarihi">
          <UInput v-model="filters.to" type="date" class="w-full" />
        </UFormField>
      </div>
      <div class="mt-4">
        <UButton color="primary" :loading="reportsStore.loading" @click="applyFilters">
          Raporu Getir
        </UButton>
      </div>
    </UCard>

    <!-- Error -->
    <UAlert v-if="reportsStore.error" color="error" :description="reportsStore.error" />

    <!-- Results -->
    <template v-if="reportsStore.report">
      <!-- Agency total -->
      <UCard>
        <template #header>
          <h2 class="text-base font-semibold">Acenta Toplamı</h2>
        </template>
        <p class="text-3xl font-bold text-gray-900">
          {{ formatMoney(reportsStore.report.agencyTotal) }}
        </p>
      </UCard>

      <!-- Agent earnings table -->
      <UCard>
        <template #header>
          <h2 class="text-base font-semibold">Ajan Bazlı Kazançlar</h2>
        </template>
        <div v-if="reportsStore.report.agents.length === 0" class="py-8 text-center text-gray-400">
          Bu filtreye ait ajan kazancı bulunamadı.
        </div>
        <table v-else class="w-full text-sm">
          <thead class="bg-gray-50 text-left">
            <tr>
              <th class="px-4 py-3 font-medium text-gray-600">Ajan</th>
              <th class="px-4 py-3 font-medium text-gray-600">İşlem Sayısı</th>
              <th class="px-4 py-3 font-medium text-gray-600 text-right">Toplam Kazanç</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="row in reportsStore.report.agents"
              :key="row.agentId"
              class="hover:bg-gray-50"
            >
              <td class="px-4 py-3 font-medium text-gray-900">{{ agentName(row.agentId) }}</td>
              <td class="px-4 py-3 text-gray-600">{{ row.transactionCount }}</td>
              <td class="px-4 py-3 text-gray-900 text-right font-semibold">
                {{ formatMoney(row.total) }}
              </td>
            </tr>
          </tbody>
        </table>
      </UCard>
    </template>
  </div>
</template>
