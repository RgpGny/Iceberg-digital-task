<script setup lang="ts">
const navLinks = [
  { label: 'Transactions', to: '/' },
  { label: 'Reports', to: '/reports' },
];

const route = useRoute();
const mobileMenuOpen = ref(false);

function isActive(path: string) {
  if (path === '/') return route.path === '/' || route.path.startsWith('/transactions');
  return route.path.startsWith(path);
}

function closeMenu() {
  mobileMenuOpen.value = false;
}

function handleNewTransaction() {
  closeMenu();
  navigateTo('/transactions/new');
}

watch(() => route.path, closeMenu);

watch(mobileMenuOpen, (open) => {
  if (import.meta.client) {
    document.body.style.overflow = open ? 'hidden' : '';
  }
});
</script>

<template>
  <div class="app-shell">
    <!-- Mobile overlay -->
    <Transition name="fade">
      <div v-if="mobileMenuOpen" class="mobile-overlay" @click="closeMenu" />
    </Transition>

    <!-- Sidebar / Mobile drawer -->
    <aside class="sidebar" :class="{ 'mobile-open': mobileMenuOpen }">
      <!-- Brand (desktop + tablet topbar) -->
      <div class="brand sidebar-brand" @click="navigateTo('/')">
        <span class="brand-top">Iceberg</span>
        <span class="brand-sub">Transactions</span>
      </div>

      <!-- Drawer header (mobile only) -->
      <div class="drawer-head">
        <div
          class="brand"
          @click="
            closeMenu();
            navigateTo('/');
          "
        >
          <span class="brand-top">Iceberg</span>
          <span class="brand-sub">Transactions</span>
        </div>
        <button class="drawer-close" aria-label="Close menu" @click="closeMenu">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 2l12 12M14 2L2 14"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      <!-- Nav -->
      <nav class="sidebar-nav">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="nav-link"
          :class="{ active: isActive(link.to) }"
          @click="closeMenu"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <!-- CTA -->
      <div class="sidebar-cta">
        <button class="btn btn-primary btn-block" @click="handleNewTransaction">
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

    <!-- Mobile topbar (hidden on tablet & desktop) -->
    <header class="mobile-topbar">
      <div class="brand" @click="navigateTo('/')">
        <span class="brand-top">Iceberg</span>
        <span class="brand-sub">Transactions</span>
      </div>
      <button class="hamburger" aria-label="Open menu" @click="mobileMenuOpen = true">
        <span /><span /><span />
      </button>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>
