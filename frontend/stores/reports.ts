import { defineStore } from 'pinia';
import type { EarningsReport } from '~/types';

export const useReportsStore = defineStore('reports', {
  state: () => ({
    report: null as EarningsReport | null,
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchEarnings(params: { agentId?: string; from?: string; to?: string }) {
      const api = useApi();
      this.loading = true;
      this.error = null;
      try {
        const query: Record<string, string> = {};
        if (params.agentId) query.agentId = params.agentId;
        if (params.from) query.from = params.from;
        if (params.to) query.to = params.to;
        this.report = await api.get<EarningsReport>('/reports/earnings', query);
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Rapor yüklenemedi';
      } finally {
        this.loading = false;
      }
    },
  },
});
