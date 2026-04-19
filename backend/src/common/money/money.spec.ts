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
      const m = Money.of(10000, 'TRY');
      expect(m.amount).toBe(10000);
      expect(m.currency).toBe('TRY');
    });

    it('rejects non-integer amounts', () => {
      expect(() => Money.of(10000.5, 'TRY')).toThrow('Money.amount must be an integer');
    });

    it('rejects NaN', () => {
      expect(() => Money.of(NaN, 'TRY')).toThrow('Money.amount must be an integer');
    });

    it('rejects Infinity', () => {
      expect(() => Money.of(Infinity, 'TRY')).toThrow('Money.amount must be an integer');
    });

    it('allows zero', () => {
      expect(Money.of(0, 'TRY').amount).toBe(0);
    });

    it('allows negative (for corrections/adjustments downstream)', () => {
      expect(Money.of(-100, 'TRY').amount).toBe(-100);
    });
  });

  describe('zeroMoney', () => {
    it('returns a zero TRY amount', () => {
      expect(zeroMoney('TRY')).toEqual({ amount: 0, currency: 'TRY' });
    });
  });

  describe('addMoney', () => {
    it('adds same-currency amounts', () => {
      expect(addMoney(Money.of(100, 'TRY'), Money.of(250, 'TRY'))).toEqual({
        amount: 350,
        currency: 'TRY',
      });
    });

    it('throws on currency mismatch', () => {
      expect(() =>
        addMoney(Money.of(1, 'TRY'), { amount: 1, currency: 'USD' } as unknown as Money),
      ).toThrow('Currency mismatch');
    });
  });

  describe('subtractMoney', () => {
    it('subtracts same-currency amounts', () => {
      expect(subtractMoney(Money.of(500, 'TRY'), Money.of(200, 'TRY'))).toEqual({
        amount: 300,
        currency: 'TRY',
      });
    });
  });

  describe('multiplyMoney', () => {
    it('multiplies by an integer factor', () => {
      expect(multiplyMoney(Money.of(100, 'TRY'), 3)).toEqual({ amount: 300, currency: 'TRY' });
    });

    it('rejects non-integer factors', () => {
      expect(() => multiplyMoney(Money.of(100, 'TRY'), 1.5)).toThrow(
        'multiplyMoney factor must be an integer',
      );
    });
  });

  describe('scaleMoney (fractional scaling with banker-style integer math)', () => {
    it('scales by numerator/denominator using integer arithmetic, rounding down', () => {
      expect(scaleMoney(Money.of(1000, 'TRY'), 1, 2)).toEqual({ amount: 500, currency: 'TRY' });
      expect(scaleMoney(Money.of(1001, 'TRY'), 1, 2)).toEqual({ amount: 500, currency: 'TRY' });
      expect(scaleMoney(Money.of(10000, 'TRY'), 1, 4)).toEqual({ amount: 2500, currency: 'TRY' });
    });

    it('rejects zero denominator', () => {
      expect(() => scaleMoney(Money.of(100, 'TRY'), 1, 0)).toThrow(
        'scaleMoney denominator must be non-zero',
      );
    });
  });

  describe('splitMoneyEvenly', () => {
    it('splits into N equal shares when divisible', () => {
      expect(splitMoneyEvenly(Money.of(1000, 'TRY'), 2)).toEqual([
        { amount: 500, currency: 'TRY' },
        { amount: 500, currency: 'TRY' },
      ]);
    });

    it('distributes the remainder to the first shares when not divisible', () => {
      expect(splitMoneyEvenly(Money.of(1001, 'TRY'), 2)).toEqual([
        { amount: 501, currency: 'TRY' },
        { amount: 500, currency: 'TRY' },
      ]);
      expect(splitMoneyEvenly(Money.of(10, 'TRY'), 3)).toEqual([
        { amount: 4, currency: 'TRY' },
        { amount: 3, currency: 'TRY' },
        { amount: 3, currency: 'TRY' },
      ]);
    });

    it('rejects n < 1', () => {
      expect(() => splitMoneyEvenly(Money.of(100, 'TRY'), 0)).toThrow(
        'splitMoneyEvenly requires n >= 1',
      );
    });
  });
});
