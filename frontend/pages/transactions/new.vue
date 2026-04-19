<script setup lang="ts">
import type { PropertyType } from '~/types';
import { useTransactionsStore } from '~/stores/transactions';

const transactionsStore = useTransactionsStore();

const form = reactive({
  address: '',
  propertyType: 'sale' as PropertyType,
  listPricePounds: '' as string | number,
  serviceFeePounds: '' as string | number,
  listingAgentId: '',
  sellingAgentId: '',
});

const submitting = ref(false);
const validationError = ref('');

async function submit() {
  validationError.value = '';

  if (!form.address.trim()) {
    validationError.value = 'Address is required.';
    return;
  }
  if (!form.listPricePounds || Number(form.listPricePounds) <= 0) {
    validationError.value = 'List price must be a valid value.';
    return;
  }
  if (!form.serviceFeePounds || Number(form.serviceFeePounds) <= 0) {
    validationError.value = 'Service fee must be a valid value.';
    return;
  }
  if (!form.listingAgentId) {
    validationError.value = 'Listing agent must be selected.';
    return;
  }
  if (!form.sellingAgentId) {
    validationError.value = 'Selling agent must be selected.';
    return;
  }

  submitting.value = true;
  try {
    const tx = await transactionsStore.create({
      property: {
        address: form.address.trim(),
        type: form.propertyType,
        listPrice: { amount: Math.round(Number(form.listPricePounds) * 100), currency: 'GBP' },
      },
      serviceFee: { amount: Math.round(Number(form.serviceFeePounds) * 100), currency: 'GBP' },
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
        Back
      </button>
      <div>
        <p class="page-eyebrow" style="margin-bottom: 4px">Transaction Management</p>
        <h1 class="f-display-italic" style="font-size: 1.75rem; margin: 0">
          New Transaction
          <span style="color: var(--color-accent-light)">Create</span>
        </h1>
      </div>
    </div>

    <div class="card">
      <!-- Property Information -->
      <div class="card-head">
        <span class="label">Property Information</span>
      </div>
      <div class="card-body space-y-5">
        <div>
          <label for="address" class="field-label">Address</label>
          <input
            id="address"
            v-model="form.address"
            class="input"
            placeholder="E.g. London, Greater London"
          />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="propertyType" class="field-label">Property Type</label>
            <select id="propertyType" v-model="form.propertyType" class="select">
              <option value="sale">Sale</option>
              <option value="rental">Rental</option>
            </select>
          </div>
          <div>
            <label for="listPrice" class="field-label">List Price (£)</label>
            <input
              id="listPrice"
              v-model="form.listPricePounds"
              type="number"
              min="1"
              class="input"
              placeholder="0"
            />
          </div>
        </div>
        <div>
          <label for="serviceFee" class="field-label">Service Fee (£)</label>
          <input
            id="serviceFee"
            v-model="form.serviceFeePounds"
            type="number"
            min="1"
            class="input"
            placeholder="0"
          />
        </div>
      </div>

      <div style="border-top: 1px solid var(--color-border)" />

      <!-- Agents -->
      <div class="card-head">
        <span class="label">Agents</span>
      </div>
      <div class="card-body space-y-4">
        <AgentPicker v-model="form.listingAgentId" label="Listing Agent" />
        <AgentPicker v-model="form.sellingAgentId" label="Selling Agent" />
        <p
          v-if="form.listingAgentId && form.listingAgentId === form.sellingAgentId"
          class="f-display-italic"
          style="font-size: 11.5px; color: var(--color-accent-dim)"
        >
          Dual role scenario — same agent covering both roles.
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
        <button class="btn btn-ghost" @click="navigateTo('/')">Cancel</button>
        <button class="btn btn-primary btn-lg" :disabled="submitting" @click="submit">
          {{ submitting ? 'Creating…' : 'Create Transaction' }}
        </button>
      </div>
    </div>
  </div>
</template>
