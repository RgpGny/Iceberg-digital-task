import { compute, CommissionInput, CommissionResult } from './commission-engine';
import { Money } from '../../../common/money';
import { BusinessError } from '../../../common/errors';

const listing = 'agent-A';
const selling = 'agent-B';

describe('commission engine', () => {
  describe('50/50 agency rule', () => {
    it('assigns the agency exactly 50 % of the total fee', () => {
      const input: CommissionInput = {
        totalFee: Money.of(1_000_000, 'TRY'),
        listingAgentId: listing,
        sellingAgentId: selling,
      };
      const result = compute(input);
      expect(result.agencyShare).toEqual({ amount: 500_000, currency: 'TRY' });
    });
  });

  describe('scenario: same listing and selling agent', () => {
    it('gives the single agent 100 % of the agent portion (= 50 % of total)', () => {
      const input: CommissionInput = {
        totalFee: Money.of(1_000_000, 'TRY'),
        listingAgentId: listing,
        sellingAgentId: listing,
      };
      const result = compute(input);

      expect(result.scenario).toBe('same_agent');
      expect(result.agencyShare).toEqual({ amount: 500_000, currency: 'TRY' });
      expect(result.agentShares).toEqual([
        {
          agentId: listing,
          role: 'dual',
          amount: { amount: 500_000, currency: 'TRY' },
          percentage: 50,
          rationale: 'Listing and selling agent are the same person — full agent portion (50%).',
        },
      ]);
    });
  });

  describe('scenario: different listing and selling agents', () => {
    it('splits the agent portion equally (25 % each of total)', () => {
      const input: CommissionInput = {
        totalFee: Money.of(1_000_000, 'TRY'),
        listingAgentId: listing,
        sellingAgentId: selling,
      };
      const result = compute(input);

      expect(result.scenario).toBe('different_agents');
      expect(result.agentShares).toHaveLength(2);
      const [a, b] = result.agentShares;
      expect(a).toEqual({
        agentId: listing,
        role: 'listing',
        amount: { amount: 250_000, currency: 'TRY' },
        percentage: 25,
        rationale: 'Listing agent — 25% of total (half of the agent portion).',
      });
      expect(b).toEqual({
        agentId: selling,
        role: 'selling',
        amount: { amount: 250_000, currency: 'TRY' },
        percentage: 25,
        rationale: 'Selling agent — 25% of total (half of the agent portion).',
      });
    });
  });

  describe('rounding is lossless', () => {
    it('with an odd total, the sum of all shares still equals the total', () => {
      const input: CommissionInput = {
        totalFee: Money.of(1_000_001, 'TRY'),
        listingAgentId: listing,
        sellingAgentId: selling,
      };
      const result = compute(input);

      const sum =
        result.agencyShare.amount +
        result.agentShares.reduce((acc, s) => acc + s.amount.amount, 0);
      expect(sum).toBe(1_000_001);
    });

    it('with total not divisible by 4, remainder still sums back to total', () => {
      const input: CommissionInput = {
        totalFee: Money.of(1_000_003, 'TRY'),
        listingAgentId: listing,
        sellingAgentId: selling,
      };
      const result = compute(input);

      expect(result.agencyShare.amount + result.agentShares.reduce((a, s) => a + s.amount.amount, 0)).toBe(1_000_003);
    });

    it('same-agent odd total also sums back to total', () => {
      const input: CommissionInput = {
        totalFee: Money.of(1_000_001, 'TRY'),
        listingAgentId: listing,
        sellingAgentId: listing,
      };
      const result = compute(input);
      const sum = result.agencyShare.amount + result.agentShares.reduce((a, s) => a + s.amount.amount, 0);
      expect(sum).toBe(1_000_001);
    });
  });

  describe('input validation', () => {
    it('throws BusinessError for zero total fee', () => {
      expect(() =>
        compute({
          totalFee: Money.of(0, 'TRY'),
          listingAgentId: listing,
          sellingAgentId: selling,
        }),
      ).toThrow(BusinessError);
    });

    it('throws BusinessError for negative total fee', () => {
      expect(() =>
        compute({
          totalFee: Money.of(-100, 'TRY'),
          listingAgentId: listing,
          sellingAgentId: selling,
        }),
      ).toThrow(BusinessError);
    });

    it('throws BusinessError for missing listingAgentId', () => {
      expect(() =>
        compute({
          totalFee: Money.of(1000, 'TRY'),
          listingAgentId: '',
          sellingAgentId: selling,
        }),
      ).toThrow(BusinessError);
    });

    it('throws BusinessError for missing sellingAgentId', () => {
      expect(() =>
        compute({
          totalFee: Money.of(1000, 'TRY'),
          listingAgentId: listing,
          sellingAgentId: '',
        }),
      ).toThrow(BusinessError);
    });
  });

  describe('percentage values', () => {
    it('exposes percentages in human units (not fractions)', () => {
      const result: CommissionResult = compute({
        totalFee: Money.of(1_000_000, 'TRY'),
        listingAgentId: listing,
        sellingAgentId: selling,
      });
      expect(result.agentShares.every((s) => s.percentage === 25)).toBe(true);
    });
  });
});
