export type Stage = 'agreement' | 'earnest_money' | 'title_deed' | 'completed';
export type PropertyType = 'sale' | 'rental';
export type CommissionRole = 'listing' | 'selling' | 'dual';
export type CommissionScenario = 'same_agent' | 'different_agents';

export interface Money {
  amount: number;
  currency: 'GBP';
}

export interface Property {
  address: string;
  type: PropertyType;
  listPrice: Money;
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface StageHistoryEntry {
  from: Stage | null;
  to: Stage;
  at: string;
  note?: string;
}

export interface Transaction {
  id: string;
  property: Property;
  serviceFee: Money;
  listingAgentId: string;
  sellingAgentId: string;
  stage: Stage;
  stageHistory: StageHistoryEntry[];
  completedAt: string | null;
  createdAt: string;
}

export interface AgentShare {
  agentId: string;
  role: CommissionRole;
  amount: Money;
  percentage: number;
  rationale: string;
}

export interface CommissionBreakdown {
  id: string;
  transactionId: string;
  totalFee: Money;
  agencyShare: Money;
  agentShares: AgentShare[];
  scenario: CommissionScenario;
  computedAt: string;
}

export interface AgentEarnings {
  agentId: string;
  total: Money;
  transactionCount: number;
}

export interface EarningsReport {
  agencyTotal: Money;
  agents: AgentEarnings[];
}

export interface CreateTransactionPayload {
  property: {
    address: string;
    type: PropertyType;
    listPrice: Money;
  };
  serviceFee: Money;
  listingAgentId: string;
  sellingAgentId: string;
}

export const STAGE_ORDER: Stage[] = ['agreement', 'earnest_money', 'title_deed', 'completed'];

export const STAGE_LABELS: Record<Stage, string> = {
  agreement: 'Agreement',
  earnest_money: 'Earnest Money',
  title_deed: 'Title Deed',
  completed: 'Completed',
};

export function nextStage(current: Stage): Stage | null {
  const idx = STAGE_ORDER.indexOf(current);
  return idx < STAGE_ORDER.length - 1 ? STAGE_ORDER[idx + 1] : null;
}

export function formatMoney(money: Money): string {
  return (money.amount / 100).toLocaleString('en-GB', {
    style: 'currency',
    currency: money.currency,
  });
}
