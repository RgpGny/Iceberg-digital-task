<script setup lang="ts">
const navLinks = [
  { label: 'İşlemler', to: '/' },
  { label: 'Raporlar', to: '/reports' },
];

const route = useRoute();
function isActive(path: string) {
  if (path === '/') return route.path === '/';
  return route.path.startsWith(path);
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Top nav -->
    <header class="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div class="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <NuxtLink to="/" class="text-lg font-bold text-gray-900 tracking-tight">
          Iceberg Transactions
        </NuxtLink>
        <nav class="flex items-center gap-1">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            :class="
              isActive(link.to)
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            "
          >
            {{ link.label }}
          </NuxtLink>
          <UButton size="sm" color="primary" class="ml-3" @click="navigateTo('/transactions/new')">
            + Yeni İşlem
          </UButton>
        </nav>
      </div>
    </header>

    <!-- Page content -->
    <main>
      <slot />
    </main>
  </div>
</template>
