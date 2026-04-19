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
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-10">
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
        Geri
      </button>
      <div>
        <p class="page-eyebrow" style="margin-bottom: 4px">İşlem Yönetimi</p>
        <h1 class="f-display-italic" style="font-size: 1.75rem; margin: 0">
          Yeni İşlem
          <span style="color: var(--color-accent-light)">Oluştur</span>
        </h1>
      </div>
    </div>

    <div class="card">
      <!-- Mülk Bilgileri -->
      <div class="card-head">
        <span class="label">Mülk Bilgileri</span>
      </div>
      <div class="card-body space-y-5">
        <div>
          <label for="address" class="field-label">Adres</label>
          <input
            id="address"
            v-model="form.address"
            class="input"
            placeholder="Örn: Kadıköy, İstanbul"
          />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="propertyType" class="field-label">Mülk Türü</label>
            <select id="propertyType" v-model="form.propertyType" class="select">
              <option value="sale">Satış</option>
              <option value="rental">Kiralık</option>
            </select>
          </div>
          <div>
            <label for="listPrice" class="field-label">Liste Fiyatı (₺)</label>
            <input
              id="listPrice"
              v-model="form.listPriceTL"
              type="number"
              min="1"
              class="input"
              placeholder="0"
            />
          </div>
        </div>
        <div>
          <label for="serviceFee" class="field-label">Hizmet Bedeli (₺)</label>
          <input
            id="serviceFee"
            v-model="form.serviceFeeTL"
            type="number"
            min="1"
            class="input"
            placeholder="0"
          />
        </div>
      </div>

      <div style="border-top: 1px solid var(--color-border)" />

      <!-- Ajanlar -->
      <div class="card-head">
        <span class="label">Ajanlar</span>
      </div>
      <div class="card-body space-y-4">
        <AgentPicker v-model="form.listingAgentId" label="Satışa Çıkaran Ajan" />
        <AgentPicker v-model="form.sellingAgentId" label="Satan Ajan" />
        <p
          v-if="form.listingAgentId && form.listingAgentId === form.sellingAgentId"
          class="f-display-italic"
          style="font-size: 11.5px; color: var(--color-accent-dim)"
        >
          Çift rol senaryosu — aynı ajan iki rolü üstleniyor.
        </p>
      </div>

      <!-- Validation error -->
      <div v-if="validationError" class="error-banner mx-5 mb-4">
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          style="flex-shrink: 0; color: var(--color-danger)"
        >
          <path
            d="M7 1L13 12H1L7 1z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
          <path
            d="M7 5v3M7 10v.5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
        {{ validationError }}
      </div>

      <!-- Actions -->
      <div class="card-foot flex items-center justify-between">
        <button class="btn btn-ghost" @click="navigateTo('/')">İptal</button>
        <button class="btn btn-primary btn-lg" :disabled="submitting" @click="submit">
          {{ submitting ? 'Oluşturuluyor…' : 'İşlem Oluştur' }}
        </button>
      </div>
    </div>
  </div>
</template>
