import { defineStore } from 'pinia';
import type { Agent } from '~/types';

export const useAgentsStore = defineStore('agents', {
  state: () => ({
    agents: [] as Agent[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchAll() {
      const api = useApi();
      this.loading = true;
      this.error = null;
      try {
        this.agents = await api.get<Agent[]>('/agents');
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Ajanlar yüklenemedi';
      } finally {
        this.loading = false;
      }
    },

    async create(name: string, email: string) {
      const api = useApi();
      this.loading = true;
      this.error = null;
      try {
        const agent = await api.post<Agent>('/agents', { name, email });
        this.agents.push(agent);
        return agent;
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Ajan oluşturulamadı';
        throw err;
      } finally {
        this.loading = false;
      }
    },
  },
});
