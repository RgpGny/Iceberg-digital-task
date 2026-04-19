export type Currency = 'GBP';

export interface Money {
  readonly amount: number;
  readonly currency: Currency;
}

export const Money = {
  of(amount: number, currency: Currency): Money {
    if (!Number.isInteger(amount)) {
      throw new Error('Money.amount must be an integer (minor units, e.g. pence)');
    }
    return { amount, currency };
  },
};

export function zeroMoney(currency: Currency): Money {
  return { amount: 0, currency };
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amount: a.amount + b.amount, currency: a.currency };
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amount: a.amount - b.amount, currency: a.currency };
}

export function multiplyMoney(a: Money, factor: number): Money {
  if (!Number.isInteger(factor)) {
    throw new Error('multiplyMoney factor must be an integer');
  }
  return { amount: a.amount * factor, currency: a.currency };
}

export function scaleMoney(a: Money, numerator: number, denominator: number): Money {
  if (denominator === 0) {
    throw new Error('scaleMoney denominator must be non-zero');
  }
  return { amount: Math.floor((a.amount * numerator) / denominator), currency: a.currency };
}

export function splitMoneyEvenly(a: Money, n: number): Money[] {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error('splitMoneyEvenly requires n >= 1');
  }
  const base = Math.floor(a.amount / n);
  const remainder = a.amount - base * n;
  return Array.from({ length: n }, (_, i) => ({
    amount: i < remainder ? base + 1 : base,
    currency: a.currency,
  }));
}
