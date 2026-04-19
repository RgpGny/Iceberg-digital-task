<script setup lang="ts">
import type { PropertyType } from '~/types';
import { useTransactionsStore } from '~/stores/transactions';

const transactionsStore = useTransactionsStore();

const form = reactive({
  address: '',
  propertyType: 'sale' as PropertyType,
  listPriceTL: '' as string | number,
  serviceFeeTL: '' as string | number,
  listingAgentId: '',
  sellingAgentId: '',
});

const propertyTypeItems = [
  { label: 'Satış', value: 'sale' },
  { label: 'Kiralık', value: 'rental' },
];

const submitting = ref(false);
const validationError = ref('');

async function submit() {
  validationError.value = '';

  if (!form.address.trim()) {
    validationError.value = 'Adres zorunludur.';
    return;
  }
  if (!form.listPriceTL || Number(form.listPriceTL) <= 0) {
    validationError.value = 'Liste fiyatı geçerli bir değer olmalıdır.';
    return;
  }
  if (!form.serviceFeeTL || Number(form.serviceFeeTL) <= 0) {
    validationError.value = 'Hizmet bedeli geçerli bir değer olmalıdır.';
    return;
  }
  if (!form.listingAgentId) {
    validationError.value = 'Satışa çıkaran ajan seçilmelidir.';
    return;
  }
  if (!form.sellingAgentId) {
    validationError.value = 'Satan ajan seçilmelidir.';
    return;
  }

  submitting.value = true;
  try {
    const tx = await transactionsStore.create({
      property: {
        address: form.address.trim(),
        type: form.propertyType,
        listPrice: { amount: Math.round(Number(form.listPriceTL) * 100), currency: 'TRY' },
      },
      serviceFee: { amount: Math.round(Number(form.serviceFeeTL) * 100), currency: 'TRY' },
      listingAgentId: form.listingAgentId,
      sellingAgentId: form.sellingAgentId,
    });
    await navigateTo(`/transactions/${tx.id}`);
  } catch {
    validationError.value = transactionsStore.error ?? 'İşlem oluşturulamadı.';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-8 space-y-6">
    <div class="flex items-center gap-3">
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-heroicons-arrow-left"
        @click="navigateTo('/')"
      >
        Geri
      </UButton>
      <h1 class="text-2xl font-bold text-gray-900">Yeni İşlem Oluştur</h1>
    </div>

    <UCard>
      <div class="space-y-5">
        <h2 class="text-base font-semibold text-gray-700">Mülk Bilgileri</h2>

        <UFormField label="Adres">
          <UInput v-model="form.address" placeholder="Örn. Kadıköy, İstanbul" class="w-full" />
        </UFormField>

        <UFormField label="Mülk Türü">
          <USelect v-model="form.propertyType" :items="propertyTypeItems" class="w-full" />
        </UFormField>

        <UFormField label="Liste Fiyatı (₺)">
          <UInput
            v-model="form.listPriceTL"
            type="number"
            min="1"
            placeholder="Örn. 2500000"
            class="w-full"
          />
        </UFormField>

        <h2 class="text-base font-semibold text-gray-700 pt-2">Hizmet Bedeli</h2>

        <UFormField label="Hizmet Bedeli (₺)">
          <UInput
            v-model="form.serviceFeeTL"
            type="number"
            min="1"
            placeholder="Örn. 75000"
            class="w-full"
          />
        </UFormField>

        <h2 class="text-base font-semibold text-gray-700 pt-2">Ajanlar</h2>

        <AgentPicker v-model="form.listingAgentId" label="Satışa Çıkaran Ajan" />
        <AgentPicker v-model="form.sellingAgentId" label="Satan Ajan" />

        <UAlert v-if="validationError" color="error" :description="validationError" />

        <div class="flex gap-3 pt-2">
          <UButton color="primary" :loading="submitting" @click="submit"> İşlem Oluştur </UButton>
          <UButton
            color="neutral"
            variant="outline"
            :disabled="submitting"
            @click="navigateTo('/')"
          >
            İptal
          </UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>
