<script setup lang="ts">
import type { Stage } from '~/types';
import { STAGE_LABELS, STAGE_ORDER, formatMoney } from '~/types';
import { useTransactionsStore } from '~/stores/transactions';

const transactionsStore = useTransactionsStore();
const activeFilter = ref<Stage | ''>('');

const stageBadgeColor: Record<Stage, string> = {
  agreement: 'neutral',
  earnest_money: 'warning',
  title_deed: 'primary',
  completed: 'success',
};

const stageFilters = [
  { label: 'Tümü', value: '' as Stage | '' },
  ...STAGE_ORDER.map((s) => ({ label: STAGE_LABELS[s], value: s as Stage | '' })),
];

async function applyFilter(val: Stage | '') {
  activeFilter.value = val;
  await transactionsStore.fetchAll(val || undefined);
}

onMounted(() => transactionsStore.fetchAll());

const stats = computed(() => {
  const list = transactionsStore.list;
  return STAGE_ORDER.map((s) => ({
    stage: s,
    label: STAGE_LABELS[s],
    count: list.filter((t) => t.stage === s).length,
  }));
});
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-8 space-y-8">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">Gayrimenkul İşlemleri</h1>
      <UButton color="primary" @click="navigateTo('/transactions/new')"> + Yeni İşlem </UButton>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <UCard v-for="s in stats" :key="s.stage" class="text-center">
        <p class="text-3xl font-bold text-gray-900">{{ s.count }}</p>
        <p class="text-sm text-gray-500 mt-1">{{ s.label }}</p>
      </UCard>
    </div>

    <!-- Stage filter -->
    <div class="flex flex-wrap gap-2">
      <UButton
        v-for="f in stageFilters"
        :key="f.value"
        size="sm"
        :color="activeFilter === f.value ? 'primary' : 'neutral'"
        :variant="activeFilter === f.value ? 'solid' : 'outline'"
        @click="applyFilter(f.value)"
      >
        {{ f.label }}
      </UButton>
    </div>

    <!-- Error -->
    <UAlert v-if="transactionsStore.error" color="error" :description="transactionsStore.error" />

    <!-- Loading -->
    <div v-if="transactionsStore.loading" class="text-center py-12 text-gray-400">
      Yükleniyor...
    </div>

    <!-- Transaction table -->
    <div v-else class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-left">
          <tr>
            <th class="px-4 py-3 font-medium text-gray-600">Mülk</th>
            <th class="px-4 py-3 font-medium text-gray-600">Tür</th>
            <th class="px-4 py-3 font-medium text-gray-600">Hizmet Bedeli</th>
            <th class="px-4 py-3 font-medium text-gray-600">Aşama</th>
            <th class="px-4 py-3 font-medium text-gray-600">Tarih</th>
            <th class="px-4 py-3 font-medium text-gray-600"/>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-if="transactionsStore.list.length === 0">
            <td colspan="6" class="px-4 py-12 text-center text-gray-400">İşlem bulunamadı.</td>
          </tr>
          <tr
            v-for="tx in transactionsStore.list"
            :key="tx.id"
            class="hover:bg-gray-50 transition-colors"
          >
            <td class="px-4 py-3 font-medium text-gray-900">{{ tx.property.address }}</td>
            <td class="px-4 py-3 text-gray-600">
              {{ tx.property.type === 'sale' ? 'Satış' : 'Kiralık' }}
            </td>
            <td class="px-4 py-3 text-gray-900">{{ formatMoney(tx.serviceFee) }}</td>
            <td class="px-4 py-3">
              <UBadge :color="stageBadgeColor[tx.stage]" variant="soft">
                {{ STAGE_LABELS[tx.stage] }}
              </UBadge>
            </td>
            <td class="px-4 py-3 text-gray-500">
              {{ new Date(tx.createdAt).toLocaleDateString('tr-TR') }}
            </td>
            <td class="px-4 py-3">
              <UButton
                size="xs"
                color="neutral"
                variant="outline"
                @click="navigateTo(`/transactions/${tx.id}`)"
              >
                Görüntüle
              </UButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
