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
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-8 space-y-6">
    <!-- Back -->
    <div class="flex items-center gap-3">
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-heroicons-arrow-left"
        @click="navigateTo('/')"
      >
        Geri
      </UButton>
      <h1 class="text-2xl font-bold text-gray-900">İşlem Detayı</h1>
    </div>

    <!-- Loading -->
    <div v-if="transactionsStore.loading && !tx" class="text-center py-16 text-gray-400">
      Yükleniyor...
    </div>

    <!-- Error -->
    <UAlert
      v-else-if="transactionsStore.error"
      color="error"
      :description="transactionsStore.error"
    />

    <template v-else-if="tx">
      <!-- Property card -->
      <UCard>
        <template #header>
          <h2 class="text-base font-semibold">Mülk Bilgileri</h2>
        </template>
        <dl class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt class="text-gray-500">Adres</dt>
            <dd class="font-medium text-gray-900 mt-0.5">{{ tx.property.address }}</dd>
          </div>
          <div>
            <dt class="text-gray-500">Tür</dt>
            <dd class="font-medium text-gray-900 mt-0.5">
              {{ tx.property.type === 'sale' ? 'Satış' : 'Kiralık' }}
            </dd>
          </div>
          <div>
            <dt class="text-gray-500">Liste Fiyatı</dt>
            <dd class="font-medium text-gray-900 mt-0.5">
              {{ formatMoney(tx.property.listPrice) }}
            </dd>
          </div>
          <div>
            <dt class="text-gray-500">Hizmet Bedeli</dt>
            <dd class="font-medium text-gray-900 mt-0.5">{{ formatMoney(tx.serviceFee) }}</dd>
          </div>
          <div>
            <dt class="text-gray-500">Satışa Çıkaran Ajan</dt>
            <dd class="font-medium text-gray-900 mt-0.5">{{ agentName(tx.listingAgentId) }}</dd>
          </div>
          <div>
            <dt class="text-gray-500">Satan Ajan</dt>
            <dd class="font-medium text-gray-900 mt-0.5">{{ agentName(tx.sellingAgentId) }}</dd>
          </div>
          <div v-if="tx.completedAt">
            <dt class="text-gray-500">Tamamlanma Tarihi</dt>
            <dd class="font-medium text-gray-900 mt-0.5">
              {{ new Date(tx.completedAt).toLocaleDateString('tr-TR') }}
            </dd>
          </div>
        </dl>
      </UCard>

      <!-- Stage timeline -->
      <UCard>
        <template #header>
          <h2 class="text-base font-semibold">Aşama Durumu</h2>
        </template>
        <StageTimeline :stage="tx.stage" :stage-history="tx.stageHistory" />

        <div class="mt-6">
          <TransitionButton
            :transaction-id="tx.id"
            :current-stage="tx.stage"
            @transitioned="onTransitioned"
          />
        </div>
      </UCard>

      <!-- Stage history log -->
      <UCard v-if="tx.stageHistory.length > 0">
        <template #header>
          <h2 class="text-base font-semibold">Aşama Geçmiş Kaydı</h2>
        </template>
        <div class="space-y-2 text-sm">
          <div
            v-for="(entry, i) in [...tx.stageHistory].reverse()"
            :key="i"
            class="flex items-start gap-3 border-b border-gray-100 pb-2 last:border-0"
          >
            <span class="text-gray-400 shrink-0 mt-0.5">
              {{ new Date(entry.at).toLocaleString('tr-TR') }}
            </span>
            <span class="text-gray-700">
              <template v-if="entry.from">
                {{ STAGE_LABELS[entry.from] }} → {{ STAGE_LABELS[entry.to] }}
              </template>
              <template v-else> Başlangıç: {{ STAGE_LABELS[entry.to] }} </template>
            </span>
            <span v-if="entry.note" class="text-gray-400 italic">« {{ entry.note }} »</span>
          </div>
        </div>
      </UCard>

      <!-- Commission breakdown (only when completed) -->
      <CommissionBreakdownCard
        v-if="breakdown"
        :breakdown="breakdown"
        :agents="agentsStore.agents"
      />
    </template>
  </div>
</template>
