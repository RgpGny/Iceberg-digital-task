<script setup lang="ts">
const navLinks = [
  { label: 'Transactions', to: '/' },
  { label: 'Reports', to: '/reports' },
];

const route = useRoute();
function isActive(path: string) {
  if (path === '/') return route.path === '/' || route.path.startsWith('/transactions');
  return route.path.startsWith(path);
}
</script>

<template>
  <div class="app-shell">
    <!-- Sidebar -->
    <aside class="sidebar">
      <!-- Brand -->
      <div class="brand" @click="navigateTo('/')">
        <span class="brand-top">Iceberg</span>
        <span class="brand-sub">Transactions</span>
      </div>

      <!-- Nav -->
      <nav class="sidebar-nav">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="nav-link"
          :class="{ active: isActive(link.to) }"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <!-- CTA -->
      <div class="sidebar-cta">
        <button class="btn btn-primary btn-block" @click="navigateTo('/transactions/new')">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="flex-shrink: 0">
            <path
              d="M6 1v10M1 6h10"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
          New Transaction
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>
