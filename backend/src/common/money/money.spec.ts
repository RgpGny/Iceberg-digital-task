import {
  Money,
  addMoney,
  multiplyMoney,
  scaleMoney,
  subtractMoney,
  zeroMoney,
  splitMoneyEvenly,
} from './money';

describe('Money', () => {
  describe('construction via Money.of', () => {
    it('creates a Money value with integer minor units', () => {
      const m = Money.of(10000, 'GBP');
      expect(m.amount).toBe(10000);
      expect(m.currency).toBe('GBP');
    });

    it('rejects non-integer amounts', () => {
      expect(() => Money.of(10000.5, 'GBP')).toThrow('Money.amount must be an integer');
    });

    it('rejects NaN', () => {
      expect(() => Money.of(NaN, 'GBP')).toThrow('Money.amount must be an integer');
    });

    it('rejects Infinity', () => {
      expect(() => Money.of(Infinity, 'GBP')).toThrow('Money.amount must be an integer');
    });

    it('allows zero', () => {
      expect(Money.of(0, 'GBP').amount).toBe(0);
    });

    it('allows negative (for corrections/adjustments downstream)', () => {
      expect(Money.of(-100, 'GBP').amount).toBe(-100);
    });
  });

  describe('zeroMoney', () => {
    it('returns a zero GBP amount', () => {
      expect(zeroMoney('GBP')).toEqual({ amount: 0, currency: 'GBP' });
    });
  });

  describe('addMoney', () => {
    it('adds same-currency amounts', () => {
      expect(addMoney(Money.of(100, 'GBP'), Money.of(250, 'GBP'))).toEqual({
        amount: 350,
        currency: 'GBP',
      });
    });

    it('throws on currency mismatch', () => {
      expect(() =>
        addMoney(Money.of(1, 'GBP'), { amount: 1, currency: 'USD' } as unknown as Money),
      ).toThrow('Currency mismatch');
    });
  });

  describe('subtractMoney', () => {
    it('subtracts same-currency amounts', () => {
      expect(subtractMoney(Money.of(500, 'GBP'), Money.of(200, 'GBP'))).toEqual({
        amount: 300,
        currency: 'GBP',
      });
    });
  });

  describe('multiplyMoney', () => {
    it('multiplies by an integer factor', () => {
      expect(multiplyMoney(Money.of(100, 'GBP'), 3)).toEqual({ amount: 300, currency: 'GBP' });
    });

    it('rejects non-integer factors', () => {
      expect(() => multiplyMoney(Money.of(100, 'GBP'), 1.5)).toThrow(
        'multiplyMoney factor must be an integer',
      );
    });
  });

  describe('scaleMoney (fractional scaling with banker-style integer math)', () => {
    it('scales by numerator/denominator using integer arithmetic, rounding down', () => {
      expect(scaleMoney(Money.of(1000, 'GBP'), 1, 2)).toEqual({ amount: 500, currency: 'GBP' });
      expect(scaleMoney(Money.of(1001, 'GBP'), 1, 2)).toEqual({ amount: 500, currency: 'GBP' });
      expect(scaleMoney(Money.of(10000, 'GBP'), 1, 4)).toEqual({ amount: 2500, currency: 'GBP' });
    });

    it('rejects zero denominator', () => {
      expect(() => scaleMoney(Money.of(100, 'GBP'), 1, 0)).toThrow(
        'scaleMoney denominator must be non-zero',
      );
    });
  });

  describe('splitMoneyEvenly', () => {
    it('splits into N equal shares when divisible', () => {
      expect(splitMoneyEvenly(Money.of(1000, 'GBP'), 2)).toEqual([
        { amount: 500, currency: 'GBP' },
        { amount: 500, currency: 'GBP' },
      ]);
    });

    it('distributes the remainder to the first shares when not divisible', () => {
      expect(splitMoneyEvenly(Money.of(1001, 'GBP'), 2)).toEqual([
        { amount: 501, currency: 'GBP' },
        { amount: 500, currency: 'GBP' },
      ]);
      expect(splitMoneyEvenly(Money.of(10, 'GBP'), 3)).toEqual([
        { amount: 4, currency: 'GBP' },
        { amount: 3, currency: 'GBP' },
        { amount: 3, currency: 'GBP' },
      ]);
    });

    it('rejects n < 1', () => {
      expect(() => splitMoneyEvenly(Money.of(100, 'GBP'), 0)).toThrow(
        'splitMoneyEvenly requires n >= 1',
      );
    });
  });
});
