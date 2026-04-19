import { Money, scaleMoney, subtractMoney, splitMoneyEvenly } from '../../../common/money';
import { BusinessError } from '../../../common/errors';

export interface CommissionInput {
  totalFee: Money;
  listingAgentId: string;
  sellingAgentId: string;
}

export type AgentRole = 'listing' | 'selling' | 'dual';
export type Scenario = 'same_agent' | 'different_agents';

export interface AgentShare {
  agentId: string;
  role: AgentRole;
  amount: Money;
  percentage: number;
  rationale: string;
}

export interface CommissionResult {
  scenario: Scenario;
  totalFee: Money;
  agencyShare: Money;
  agentShares: AgentShare[];
}

export function compute(input: CommissionInput): CommissionResult {
  validate(input);

  const { totalFee, listingAgentId, sellingAgentId } = input;

  const agencyShare = scaleMoney(totalFee, 1, 2);
  const agentPortion = subtractMoney(totalFee, agencyShare);

  if (listingAgentId === sellingAgentId) {
    return {
      scenario: 'same_agent',
      totalFee,
      agencyShare,
      agentShares: [
        {
          agentId: listingAgentId,
          role: 'dual',
          amount: agentPortion,
          percentage: 50,
          rationale: 'Listing and selling agent are the same person — full agent portion (50%).',
        },
      ],
    };
  }

  const [listingAmount, sellingAmount] = splitMoneyEvenly(agentPortion, 2);

  return {
    scenario: 'different_agents',
    totalFee,
    agencyShare,
    agentShares: [
      {
        agentId: listingAgentId,
        role: 'listing',
        amount: listingAmount,
        percentage: 25,
        rationale: 'Listing agent — 25% of total (half of the agent portion).',
      },
      {
        agentId: sellingAgentId,
        role: 'selling',
        amount: sellingAmount,
        percentage: 25,
        rationale: 'Selling agent — 25% of total (half of the agent portion).',
      },
    ],
  };
}

function validate(input: CommissionInput): void {
  if (input.totalFee.amount <= 0) {
    throw new BusinessError('invalid_fee', 'Total fee must be positive', {
      amount: input.totalFee.amount,
    });
  }
  if (!input.listingAgentId) {
    throw new BusinessError('missing_agent', 'listingAgentId is required');
  }
  if (!input.sellingAgentId) {
    throw new BusinessError('missing_agent', 'sellingAgentId is required');
  }
}
