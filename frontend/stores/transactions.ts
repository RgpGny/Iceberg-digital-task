import { defineStore } from 'pinia';
import type { CommissionBreakdown, CreateTransactionPayload, Stage, Transaction } from '~/types';

export const useTransactionsStore = defineStore('transactions', {
  state: () => ({
    list: [] as Transaction[],
    current: null as Transaction | null,
    breakdown: null as CommissionBreakdown | null,
    loading: false,
    error: null as string | null,
    stageFilter: '' as Stage | '',
  }),

  actions: {
    async fetchAll(stage?: Stage) {
      const api = useApi();
      this.loading = true;
      this.error = null;
      try {
        const query: Record<string, string> = {};
        if (stage) query.stage = stage;
        this.list = await api.get<Transaction[]>('/transactions', query);
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'İşlemler yüklenemedi';
      } finally {
        this.loading = false;
      }
    },

    async fetchOne(id: string) {
      const api = useApi();
      this.loading = true;
      this.error = null;
      try {
        this.current = await api.get<Transaction>(`/transactions/${id}`);
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'İşlem yüklenemedi';
      } finally {
        this.loading = false;
      }
    },

    async create(payload: CreateTransactionPayload) {
      const api = useApi();
      this.loading = true;
      this.error = null;
      try {
        const transaction = await api.post<Transaction>('/transactions', payload);
        this.list.unshift(transaction);
        return transaction;
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'İşlem oluşturulamadı';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async transition(id: string, toStage: Stage, note?: string) {
      const api = useApi();
      this.loading = true;
      this.error = null;
      try {
        const body: { toStage: Stage; note?: string } = { toStage };
        if (note) body.note = note;
        this.current = await api.post<Transaction>(`/transactions/${id}/transition`, body);
        const idx = this.list.findIndex((t) => t.id === id);
        if (idx !== -1 && this.current) {
          this.list[idx] = this.current;
        }
        return this.current;
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Aşama ilerletilemedi';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async fetchBreakdown(id: string) {
      const api = useApi();
      try {
        this.breakdown = await api.get<CommissionBreakdown>(`/transactions/${id}/breakdown`);
      } catch {
        this.breakdown = null;
      }
    },
  },
});
