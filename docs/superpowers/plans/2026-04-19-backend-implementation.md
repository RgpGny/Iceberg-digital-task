# Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a tested, deployed NestJS 10 API covering the full PDF brief (agents, transactions with stage lifecycle, commission breakdowns, reports), running on Render with MongoDB Atlas and reachable via a public URL.

**Architecture:** NestJS modules (`agents`, `transactions`, `commissions`, `reports`, `health`) built on Mongoose 8. The state machine and commission engine are pure, 100 %-tested functions that the services call — no business logic inside controllers. Money is an integer-minor-units value object. DTOs are the API contract; Mongoose schemas never leak. A single global exception filter returns structured errors. Swagger documents everything at `/api/docs`.

**Tech Stack:** Node 20 LTS · NestJS 10 · Mongoose 8 · MongoDB Atlas M0 · Jest · `mongodb-memory-server` · `class-validator` · `@nestjs/swagger@^8` · Render (deploy target).

---

## File Structure After This Plan

```
backend/
├── src/
│   ├── main.ts                                     [unchanged]
│   ├── app.module.ts                               [modify: register new modules + exception filter]
│   ├── common/
│   │   ├── money/
│   │   │   ├── money.ts                            [Money type + helpers]
│   │   │   ├── money.spec.ts                       [unit tests]
│   │   │   └── index.ts                            [barrel]
│   │   ├── errors/
│   │   │   ├── business.error.ts                   [BusinessError class]
│   │   │   └── index.ts                            [barrel]
│   │   └── filters/
│   │       ├── all-exceptions.filter.ts            [global filter]
│   │       └── all-exceptions.filter.spec.ts
│   ├── config/
│   │   └── env.validation.ts                       [unchanged]
│   ├── health/
│   │   ├── health.controller.ts
│   │   └── health.module.ts
│   ├── modules/
│   │   ├── agents/
│   │   │   ├── schemas/agent.schema.ts
│   │   │   ├── dto/create-agent.dto.ts
│   │   │   ├── dto/agent-response.dto.ts
│   │   │   ├── agents.service.ts
│   │   │   ├── agents.service.spec.ts
│   │   │   ├── agents.controller.ts
│   │   │   └── agents.module.ts
│   │   ├── transactions/
│   │   │   ├── state-machine/
│   │   │   │   ├── state-machine.ts                [pure canTransition, nextStages]
│   │   │   │   ├── state-machine.spec.ts
│   │   │   │   └── index.ts
│   │   │   ├── schemas/transaction.schema.ts
│   │   │   ├── dto/create-transaction.dto.ts
│   │   │   ├── dto/transition.dto.ts
│   │   │   ├── dto/transaction-response.dto.ts
│   │   │   ├── transactions.service.ts
│   │   │   ├── transactions.service.spec.ts
│   │   │   ├── transactions.controller.ts
│   │   │   └── transactions.module.ts
│   │   ├── commissions/
│   │   │   ├── engine/
│   │   │   │   ├── commission-engine.ts            [pure compute()]
│   │   │   │   ├── commission-engine.spec.ts
│   │   │   │   └── index.ts
│   │   │   ├── schemas/commission-breakdown.schema.ts
│   │   │   ├── dto/breakdown-response.dto.ts
│   │   │   ├── commissions.service.ts
│   │   │   ├── commissions.service.spec.ts
│   │   │   ├── commissions.controller.ts
│   │   │   └── commissions.module.ts
│   │   └── reports/
│   │       ├── dto/earnings-query.dto.ts
│   │       ├── dto/earnings-response.dto.ts
│   │       ├── reports.service.ts
│   │       ├── reports.service.spec.ts
│   │       ├── reports.controller.ts
│   │       └── reports.module.ts
├── scripts/
│   └── seed.ts                                     [seed 5 agents]
├── test/
│   ├── jest-e2e.json                               [unchanged]
│   ├── agents.e2e-spec.ts
│   ├── transactions.e2e-spec.ts
│   └── commissions.e2e-spec.ts
├── render.yaml                                     [Render blueprint]
├── package.json                                    [modify: add scripts + deps]
└── README.md                                       [update — Swagger, scripts, deploy notes]
```

Root-level additions:

```
.github/workflows/uptime-ping.yml                   [cron ping /health]
```

---

## Task 1: Money Value Object (TDD)

**Files:**
- Create: `backend/src/common/money/money.ts`
- Create: `backend/src/common/money/money.spec.ts`
- Create: `backend/src/common/money/index.ts`

Money is `{ amount: integer minor units, currency: 'TRY' }`. Arithmetic returns new Money objects. Currency mismatch throws.

- [ ] **Step 1: Write `backend/src/common/money/money.spec.ts`**

```ts
import { Money, addMoney, multiplyMoney, scaleMoney, subtractMoney, zeroMoney, splitMoneyEvenly } from './money';

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
      expect(() => addMoney(Money.of(1, 'TRY'), { amount: 1, currency: 'USD' } as Money)).toThrow(
        'Currency mismatch',
      );
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
      // 1000 * 1 / 2 = 500
      expect(scaleMoney(Money.of(1000, 'TRY'), 1, 2)).toEqual({ amount: 500, currency: 'TRY' });
      // 1001 * 1 / 2 = 500.5 → 500 (floor)
      expect(scaleMoney(Money.of(1001, 'TRY'), 1, 2)).toEqual({ amount: 500, currency: 'TRY' });
      // 10000 * 1 / 4 = 2500
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
      // 1001 / 2 → [501, 500]
      expect(splitMoneyEvenly(Money.of(1001, 'TRY'), 2)).toEqual([
        { amount: 501, currency: 'TRY' },
        { amount: 500, currency: 'TRY' },
      ]);
      // 10 / 3 → [4, 3, 3]
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
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `cd backend && npm run test -- common/money/money.spec.ts`
Expected: FAIL with module-not-found for `./money`.

- [ ] **Step 3: Implement `backend/src/common/money/money.ts`**

```ts
export type Currency = 'TRY';

export interface Money {
  readonly amount: number;
  readonly currency: Currency;
}

export const Money = {
  of(amount: number, currency: Currency): Money {
    if (!Number.isInteger(amount)) {
      throw new Error('Money.amount must be an integer (minor units, e.g. kuruş)');
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
  // Floor division keeps arithmetic in integer space.
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
```

- [ ] **Step 4: Create barrel `backend/src/common/money/index.ts`**

```ts
export * from './money';
```

- [ ] **Step 5: Run the tests to confirm they pass**

Run: `cd backend && npm run test -- common/money/money.spec.ts`
Expected: all green, `Tests: <N> passed`.

- [ ] **Step 6: Verify 100 % coverage for money**

Run: `cd backend && npm run test -- --coverage --collectCoverageFrom='src/common/money/**' common/money`
Expected: `Statements`, `Branches`, `Functions`, and `Lines` all at 100 % for `money.ts`.

- [ ] **Step 7: Commit**

```bash
git add backend/src/common/money/
git commit -m "feat(backend): add Money value object with integer-minor-unit arithmetic"
git push -u origin feat/backend
```

---

## Task 2: BusinessError + Global Exception Filter

**Files:**
- Create: `backend/src/common/errors/business.error.ts`
- Create: `backend/src/common/errors/index.ts`
- Create: `backend/src/common/filters/all-exceptions.filter.ts`
- Create: `backend/src/common/filters/all-exceptions.filter.spec.ts`
- Modify: `backend/src/main.ts` (register the filter)

- [ ] **Step 1: Write `backend/src/common/errors/business.error.ts`**

```ts
/**
 * Domain-level error signaling a rule violation (illegal stage transition,
 * invalid commission inputs, etc.). Mapped to HTTP 400 by the global filter.
 */
export class BusinessError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'BusinessError';
    this.code = code;
    this.details = details;
  }
}
```

- [ ] **Step 2: Create barrel `backend/src/common/errors/index.ts`**

```ts
export * from './business.error';
```

- [ ] **Step 3: Write `backend/src/common/filters/all-exceptions.filter.spec.ts`**

```ts
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { BusinessError } from '../errors';

function makeHost(): { host: ArgumentsHost; response: { status: jest.Mock; json: jest.Mock } } {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ url: '/test', method: 'GET' }),
    }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

describe('AllExceptionsFilter', () => {
  it('maps BusinessError to 400 with code + message + details', () => {
    const filter = new AllExceptionsFilter();
    const { host, response } = makeHost();

    filter.catch(new BusinessError('invalid_transition', 'Cannot skip stages', { from: 'a', to: 'b' }), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        code: 'invalid_transition',
        message: 'Cannot skip stages',
        details: { from: 'a', to: 'b' },
      }),
    );
  });

  it('passes HttpException through with its status and payload', () => {
    const filter = new AllExceptionsFilter();
    const { host, response } = makeHost();

    filter.catch(new HttpException('Not found', HttpStatus.NOT_FOUND), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: 'Not found' }),
    );
  });

  it('maps unknown errors to 500 with a generic message', () => {
    const filter = new AllExceptionsFilter();
    const { host, response } = makeHost();

    filter.catch(new Error('boom'), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500, code: 'internal_error' }),
    );
  });
});
```

- [ ] **Step 4: Write `backend/src/common/filters/all-exceptions.filter.ts`**

```ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { BusinessError } from '../errors';

interface ErrorPayload {
  statusCode: number;
  code: string;
  message: string;
  path: string;
  method: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();

    const payload = this.toPayload(exception, request);

    if (payload.statusCode >= 500) {
      this.logger.error(`${payload.method} ${payload.path} → ${payload.statusCode}`, exception);
    } else {
      this.logger.warn(`${payload.method} ${payload.path} → ${payload.statusCode} (${payload.code})`);
    }

    response.status(payload.statusCode).json(payload);
  }

  private toPayload(exception: unknown, request: Request): ErrorPayload {
    const base = {
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    };

    if (exception instanceof BusinessError) {
      return {
        ...base,
        statusCode: HttpStatus.BAD_REQUEST,
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message = typeof body === 'string' ? body : (body as { message?: string }).message ?? exception.message;
      const code = this.codeFromStatus(status);
      const details = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : undefined;
      return { ...base, statusCode: status, code, message, details };
    }

    return {
      ...base,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'internal_error',
      message: 'Unexpected server error',
    };
  }

  private codeFromStatus(status: number): string {
    switch (status) {
      case 400:
        return 'bad_request';
      case 401:
        return 'unauthorized';
      case 403:
        return 'forbidden';
      case 404:
        return 'not_found';
      case 409:
        return 'conflict';
      default:
        return 'http_error';
    }
  }
}
```

- [ ] **Step 5: Register the filter globally**

Edit `backend/src/main.ts`. Replace the entire file content with:

```ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.enableCors({
    origin: config.getOrThrow<string>('CORS_ORIGIN').split(','),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Iceberg Transactions API')
    .setDescription('Estate-agency transaction lifecycle + commission distribution')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.getOrThrow<number>('PORT');
  await app.listen(port);
}

void bootstrap();
```

- [ ] **Step 6: Run the filter tests**

Run: `cd backend && npm run test -- common/filters`
Expected: all 3 tests green.

- [ ] **Step 7: Run the full build and test suite**

```bash
cd backend
npm run build
npm run test
```
Expected: build succeeds, all tests pass.

- [ ] **Step 8: Commit**

```bash
git add backend/src/common/errors backend/src/common/filters backend/src/main.ts
git commit -m "feat(backend): add BusinessError and global AllExceptionsFilter"
git push
```

---

## Task 3: Stage State Machine (TDD, 100 % coverage)

**Files:**
- Create: `backend/src/modules/transactions/state-machine/state-machine.ts`
- Create: `backend/src/modules/transactions/state-machine/state-machine.spec.ts`
- Create: `backend/src/modules/transactions/state-machine/index.ts`

- [ ] **Step 1: Write `backend/src/modules/transactions/state-machine/state-machine.spec.ts`**

```ts
import { STAGES, Stage, canTransition, nextStage, isTerminal, assertValidTransition } from './state-machine';
import { BusinessError } from '../../../common/errors';

describe('Stage state machine', () => {
  describe('STAGES', () => {
    it('is the ordered tuple agreement → earnest_money → title_deed → completed', () => {
      expect(STAGES).toEqual(['agreement', 'earnest_money', 'title_deed', 'completed']);
    });
  });

  describe('canTransition', () => {
    it.each([
      ['agreement', 'earnest_money'],
      ['earnest_money', 'title_deed'],
      ['title_deed', 'completed'],
    ])('allows %s → %s', (from, to) => {
      expect(canTransition(from as Stage, to as Stage)).toBe(true);
    });

    it.each([
      ['agreement', 'title_deed', 'skip forward'],
      ['agreement', 'completed', 'skip forward two'],
      ['earnest_money', 'completed', 'skip forward'],
      ['earnest_money', 'agreement', 'backward'],
      ['title_deed', 'agreement', 'backward'],
      ['title_deed', 'earnest_money', 'backward'],
      ['completed', 'agreement', 'backward from terminal'],
      ['completed', 'earnest_money', 'backward from terminal'],
      ['completed', 'title_deed', 'backward from terminal'],
      ['agreement', 'agreement', 'self-loop'],
      ['earnest_money', 'earnest_money', 'self-loop'],
      ['title_deed', 'title_deed', 'self-loop'],
      ['completed', 'completed', 'self-loop'],
    ])('rejects %s → %s (%s)', (from, to) => {
      expect(canTransition(from as Stage, to as Stage)).toBe(false);
    });
  });

  describe('nextStage', () => {
    it('returns the single legal next stage for non-terminal stages', () => {
      expect(nextStage('agreement')).toBe('earnest_money');
      expect(nextStage('earnest_money')).toBe('title_deed');
      expect(nextStage('title_deed')).toBe('completed');
    });

    it('returns null for the terminal stage', () => {
      expect(nextStage('completed')).toBeNull();
    });
  });

  describe('isTerminal', () => {
    it('returns true only for completed', () => {
      expect(isTerminal('completed')).toBe(true);
      expect(isTerminal('agreement')).toBe(false);
      expect(isTerminal('earnest_money')).toBe(false);
      expect(isTerminal('title_deed')).toBe(false);
    });
  });

  describe('assertValidTransition', () => {
    it('does not throw for a legal transition', () => {
      expect(() => assertValidTransition('agreement', 'earnest_money')).not.toThrow();
    });

    it('throws BusinessError with code invalid_transition for an illegal transition', () => {
      expect(() => assertValidTransition('agreement', 'completed')).toThrow(BusinessError);
      try {
        assertValidTransition('agreement', 'completed');
      } catch (e) {
        expect((e as BusinessError).code).toBe('invalid_transition');
        expect((e as BusinessError).details).toMatchObject({ from: 'agreement', to: 'completed' });
      }
    });
  });
});
```

- [ ] **Step 2: Run the test to confirm failure**

Run: `cd backend && npm run test -- state-machine.spec.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `backend/src/modules/transactions/state-machine/state-machine.ts`**

```ts
import { BusinessError } from '../../../common/errors';

export const STAGES = ['agreement', 'earnest_money', 'title_deed', 'completed'] as const;
export type Stage = (typeof STAGES)[number];

export function canTransition(from: Stage, to: Stage): boolean {
  const fromIndex = STAGES.indexOf(from);
  const toIndex = STAGES.indexOf(to);
  if (fromIndex === -1 || toIndex === -1) return false;
  return toIndex === fromIndex + 1;
}

export function nextStage(from: Stage): Stage | null {
  const idx = STAGES.indexOf(from);
  if (idx < 0 || idx === STAGES.length - 1) return null;
  return STAGES[idx + 1];
}

export function isTerminal(stage: Stage): boolean {
  return stage === 'completed';
}

export function assertValidTransition(from: Stage, to: Stage): void {
  if (!canTransition(from, to)) {
    throw new BusinessError(
      'invalid_transition',
      `Illegal stage transition: ${from} → ${to}`,
      { from, to, allowed: nextStage(from) },
    );
  }
}
```

- [ ] **Step 4: Create barrel `backend/src/modules/transactions/state-machine/index.ts`**

```ts
export * from './state-machine';
```

- [ ] **Step 5: Run the tests — must pass**

Run: `cd backend && npm run test -- state-machine.spec.ts`
Expected: all green.

- [ ] **Step 6: Verify 100 % coverage of the state machine**

Run: `cd backend && npm run test -- --coverage --collectCoverageFrom='src/modules/transactions/state-machine/**' state-machine.spec.ts`
Expected: Statements/Branches/Functions/Lines all at **100 %** for `state-machine.ts`.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/transactions/state-machine/
git commit -m "feat(backend): add pure stage state machine with 100% test coverage"
git push
```

---

## Task 4: Commission Engine (TDD, 100 % coverage)

**Files:**
- Create: `backend/src/modules/commissions/engine/commission-engine.ts`
- Create: `backend/src/modules/commissions/engine/commission-engine.spec.ts`
- Create: `backend/src/modules/commissions/engine/index.ts`

- [ ] **Step 1: Write `backend/src/modules/commissions/engine/commission-engine.spec.ts`**

```ts
import { compute, CommissionInput, CommissionResult } from './commission-engine';
import { Money } from '../../../common/money';
import { BusinessError } from '../../../common/errors';

const listing = 'agent-A';
const selling = 'agent-B';

describe('commission engine', () => {
  describe('50/50 agency rule', () => {
    it('assigns the agency exactly 50 % of the total fee', () => {
      const input: CommissionInput = {
        totalFee: Money.of(1_000_000, 'TRY'), // 10,000 TRY in kuruş
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
      // 1_000_001 kuruş — one kuruş extra to test rounding handling
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

    it('with total not divisible by 4, remainder lands on agency per policy', () => {
      // 1_000_003: agency floor(1_000_003/2)=500_001, agents = 500_002 → 250_001 + 250_001
      const input: CommissionInput = {
        totalFee: Money.of(1_000_003, 'TRY'),
        listingAgentId: listing,
        sellingAgentId: selling,
      };
      const result = compute(input);

      expect(result.agencyShare.amount + result.agentShares.reduce((a, s) => a + s.amount.amount, 0)).toBe(1_000_003);
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
```

- [ ] **Step 2: Run the test — expect failure**

Run: `cd backend && npm run test -- commission-engine.spec.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `backend/src/modules/commissions/engine/commission-engine.ts`**

```ts
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
  percentage: number; // 25, 50, etc. (human units)
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

  // Agency always gets 50 %. Use floor(total * 1 / 2); any remainder goes to the agent portion
  // so the policy is agency-first on even totals and agent-bucket-carries-remainder otherwise.
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
          rationale:
            'Listing and selling agent are the same person — full agent portion (50%).',
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
```

- [ ] **Step 4: Create barrel `backend/src/modules/commissions/engine/index.ts`**

```ts
export * from './commission-engine';
```

- [ ] **Step 5: Run the tests — must pass**

Run: `cd backend && npm run test -- commission-engine.spec.ts`
Expected: all green.

- [ ] **Step 6: Verify 100 % coverage**

Run: `cd backend && npm run test -- --coverage --collectCoverageFrom='src/modules/commissions/engine/**' commission-engine.spec.ts`
Expected: 100 % on all four coverage metrics for `commission-engine.ts`.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/commissions/engine/
git commit -m "feat(backend): add pure commission engine with 100% test coverage"
git push
```

---

## Task 5: Agents Module (schema, DTOs, service, controller, module, unit tests)

**Files:**
- Create: `backend/src/modules/agents/schemas/agent.schema.ts`
- Create: `backend/src/modules/agents/dto/create-agent.dto.ts`
- Create: `backend/src/modules/agents/dto/agent-response.dto.ts`
- Create: `backend/src/modules/agents/agents.service.ts`
- Create: `backend/src/modules/agents/agents.service.spec.ts`
- Create: `backend/src/modules/agents/agents.controller.ts`
- Create: `backend/src/modules/agents/agents.module.ts`
- Modify: `backend/src/app.module.ts` (register `AgentsModule`)
- Modify: `backend/package.json` (add `mongodb-memory-server` dev dep)

- [ ] **Step 1: Install `mongodb-memory-server`**

```bash
cd backend
npm install --save-dev mongodb-memory-server
cd ..
```

- [ ] **Step 2: Write `backend/src/modules/agents/schemas/agent.schema.ts`**

```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AgentDocument = HydratedDocument<Agent>;

@Schema({ collection: 'agents', timestamps: true })
export class Agent {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, lowercase: true, trim: true, unique: true })
  email!: string;
}

export const AgentSchema = SchemaFactory.createForClass(Agent);
```

- [ ] **Step 3: Write `backend/src/modules/agents/dto/create-agent.dto.ts`**

```ts
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAgentDto {
  @ApiProperty({ example: 'Ayşe Yılmaz', description: 'Display name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'ayse@iceberg.example' })
  @IsEmail()
  @MaxLength(200)
  email!: string;
}
```

- [ ] **Step 4: Write `backend/src/modules/agents/dto/agent-response.dto.ts`**

```ts
import { ApiProperty } from '@nestjs/swagger';

export class AgentResponseDto {
  @ApiProperty({ example: '60f5a0b0d2f5e52f8c5a1b99' })
  id!: string;

  @ApiProperty({ example: 'Ayşe Yılmaz' })
  name!: string;

  @ApiProperty({ example: 'ayse@iceberg.example' })
  email!: string;

  @ApiProperty({ example: '2026-04-19T10:00:00.000Z' })
  createdAt!: string;
}
```

- [ ] **Step 5: Write `backend/src/modules/agents/agents.service.ts`**

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Agent, AgentDocument } from './schemas/agent.schema';
import { CreateAgentDto } from './dto/create-agent.dto';
import { AgentResponseDto } from './dto/agent-response.dto';

@Injectable()
export class AgentsService {
  constructor(@InjectModel(Agent.name) private readonly agentModel: Model<AgentDocument>) {}

  async create(dto: CreateAgentDto): Promise<AgentResponseDto> {
    const created = await this.agentModel.create({ name: dto.name, email: dto.email });
    return this.toResponse(created);
  }

  async findAll(): Promise<AgentResponseDto[]> {
    const agents = await this.agentModel.find().sort({ createdAt: 1 }).lean().exec();
    return agents.map((a) => ({
      id: String(a._id),
      name: a.name,
      email: a.email,
      createdAt: (a as unknown as { createdAt: Date }).createdAt.toISOString(),
    }));
  }

  async findById(id: string): Promise<AgentResponseDto> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(`Agent ${id} not found`);
    }
    const agent = await this.agentModel.findById(id).exec();
    if (!agent) throw new NotFoundException(`Agent ${id} not found`);
    return this.toResponse(agent);
  }

  private toResponse(doc: AgentDocument): AgentResponseDto {
    return {
      id: String(doc._id),
      name: doc.name,
      email: doc.email,
      createdAt: (doc as unknown as { createdAt: Date }).createdAt.toISOString(),
    };
  }
}
```

- [ ] **Step 6: Write `backend/src/modules/agents/agents.service.spec.ts`**

```ts
import { Test } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NotFoundException } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { Agent, AgentSchema } from './schemas/agent.schema';

describe('AgentsService', () => {
  let mongo: MongoMemoryServer;
  let service: AgentsService;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongo.getUri()),
        MongooseModule.forFeature([{ name: Agent.name, schema: AgentSchema }]),
      ],
      providers: [AgentsService],
    }).compile();
    service = module.get(AgentsService);
  });

  afterAll(async () => {
    await mongo.stop();
  });

  it('creates an agent and returns a response DTO with id', async () => {
    const dto = await service.create({ name: 'Ayşe', email: 'ayse@example.com' });
    expect(dto).toMatchObject({ name: 'Ayşe', email: 'ayse@example.com' });
    expect(dto.id).toBeDefined();
    expect(dto.createdAt).toBeDefined();
  });

  it('lists agents in creation order', async () => {
    const list = await service.findAll();
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].email).toBe('ayse@example.com');
  });

  it('returns NotFoundException for a non-existent id', async () => {
    await expect(service.findById('000000000000000000000000')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns NotFoundException for a malformed id', async () => {
    await expect(service.findById('not-a-valid-id')).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [ ] **Step 7: Write `backend/src/modules/agents/agents.controller.ts`**

```ts
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { AgentResponseDto } from './dto/agent-response.dto';

@ApiTags('agents')
@Controller('agents')
export class AgentsController {
  constructor(private readonly service: AgentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an agent' })
  @ApiResponse({ status: 201, type: AgentResponseDto })
  create(@Body() dto: CreateAgentDto): Promise<AgentResponseDto> {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all agents' })
  @ApiResponse({ status: 200, type: AgentResponseDto, isArray: true })
  findAll(): Promise<AgentResponseDto[]> {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an agent by id' })
  @ApiResponse({ status: 200, type: AgentResponseDto })
  findById(@Param('id') id: string): Promise<AgentResponseDto> {
    return this.service.findById(id);
  }
}
```

- [ ] **Step 8: Write `backend/src/modules/agents/agents.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Agent, AgentSchema } from './schemas/agent.schema';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Agent.name, schema: AgentSchema }])],
  providers: [AgentsService],
  controllers: [AgentsController],
  exports: [AgentsService],
})
export class AgentsModule {}
```

- [ ] **Step 9: Register `AgentsModule` in `backend/src/app.module.ts`**

Replace the file with:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envValidationSchema } from './config/env.validation';
import { AgentsModule } from './modules/agents/agents.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: true },
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    AgentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 10: Run tests and build**

```bash
cd backend
npm run test
npm run build
cd ..
```
Expected: all tests green (money + filter + state machine + commission engine + agents service). Build succeeds.

- [ ] **Step 11: Commit**

```bash
git add backend/
git commit -m "feat(backend): add agents module (schema, service, controller, tests)"
git push
```

---

## Task 6: Transactions Module (schema + DTOs + basic CRUD, no transition logic yet)

**Files:**
- Create: `backend/src/modules/transactions/schemas/transaction.schema.ts`
- Create: `backend/src/modules/transactions/dto/create-transaction.dto.ts`
- Create: `backend/src/modules/transactions/dto/transaction-response.dto.ts`
- Create: `backend/src/modules/transactions/transactions.service.ts`
- Create: `backend/src/modules/transactions/transactions.service.spec.ts`
- Create: `backend/src/modules/transactions/transactions.controller.ts`
- Create: `backend/src/modules/transactions/transactions.module.ts`
- Modify: `backend/src/app.module.ts` (register `TransactionsModule`)

- [ ] **Step 1: Write `backend/src/modules/transactions/schemas/transaction.schema.ts`**

```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { STAGES, Stage } from '../state-machine';

export type TransactionDocument = HydratedDocument<Transaction>;

@Schema({ _id: false })
export class MoneyEmbedded {
  @Prop({ required: true })
  amount!: number;

  @Prop({ required: true, default: 'TRY' })
  currency!: 'TRY';
}
export const MoneyEmbeddedSchema = SchemaFactory.createForClass(MoneyEmbedded);

@Schema({ _id: false })
export class PropertyEmbedded {
  @Prop({ required: true, trim: true })
  address!: string;

  @Prop({ required: true, enum: ['sale', 'rental'] })
  type!: 'sale' | 'rental';

  @Prop({ required: true, type: MoneyEmbeddedSchema })
  listPrice!: MoneyEmbedded;
}
export const PropertyEmbeddedSchema = SchemaFactory.createForClass(PropertyEmbedded);

@Schema({ _id: false })
export class StageHistoryEntry {
  @Prop({ required: false, enum: STAGES, default: null, type: String })
  from!: Stage | null;

  @Prop({ required: true, enum: STAGES })
  to!: Stage;

  @Prop({ required: true })
  at!: Date;

  @Prop({ required: false })
  note?: string;
}
export const StageHistoryEntrySchema = SchemaFactory.createForClass(StageHistoryEntry);

@Schema({ collection: 'transactions', timestamps: true })
export class Transaction {
  @Prop({ required: true, type: PropertyEmbeddedSchema })
  property!: PropertyEmbedded;

  @Prop({ required: true, type: MoneyEmbeddedSchema })
  serviceFee!: MoneyEmbedded;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Agent' })
  listingAgentId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Agent' })
  sellingAgentId!: Types.ObjectId;

  @Prop({ required: true, enum: STAGES, default: 'agreement' })
  stage!: Stage;

  @Prop({ required: true, type: [StageHistoryEntrySchema], default: [] })
  stageHistory!: StageHistoryEntry[];

  @Prop({ required: false, type: Date, default: null })
  completedAt!: Date | null;
}
export const TransactionSchema = SchemaFactory.createForClass(Transaction);
```

- [ ] **Step 2: Write `backend/src/modules/transactions/dto/create-transaction.dto.ts`**

```ts
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsMongoId, IsNotEmpty, IsString, Min, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MoneyDto {
  @ApiProperty({ example: 1_000_000, description: 'Amount in minor units (kuruş)' })
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiProperty({ example: 'TRY', enum: ['TRY'] })
  @IsEnum(['TRY'])
  currency!: 'TRY';
}

export class PropertyDto {
  @ApiProperty({ example: 'Kadıköy, Istanbul' })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({ enum: ['sale', 'rental'] })
  @IsEnum(['sale', 'rental'])
  type!: 'sale' | 'rental';

  @ApiProperty({ type: MoneyDto })
  @ValidateNested()
  @Type(() => MoneyDto)
  listPrice!: MoneyDto;
}

export class CreateTransactionDto {
  @ApiProperty({ type: PropertyDto })
  @ValidateNested()
  @Type(() => PropertyDto)
  property!: PropertyDto;

  @ApiProperty({ type: MoneyDto })
  @ValidateNested()
  @Type(() => MoneyDto)
  serviceFee!: MoneyDto;

  @ApiProperty({ example: '60f5a0b0d2f5e52f8c5a1b99' })
  @IsMongoId()
  listingAgentId!: string;

  @ApiProperty({ example: '60f5a0b0d2f5e52f8c5a1b99' })
  @IsMongoId()
  sellingAgentId!: string;
}
```

- [ ] **Step 3: Write `backend/src/modules/transactions/dto/transaction-response.dto.ts`**

```ts
import { ApiProperty } from '@nestjs/swagger';
import { Stage } from '../state-machine';
import { MoneyDto, PropertyDto } from './create-transaction.dto';

export class StageHistoryDto {
  @ApiProperty({ nullable: true, example: 'agreement' })
  from!: Stage | null;

  @ApiProperty({ example: 'earnest_money' })
  to!: Stage;

  @ApiProperty({ example: '2026-04-19T10:00:00.000Z' })
  at!: string;

  @ApiProperty({ required: false })
  note?: string;
}

export class TransactionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ type: PropertyDto })
  property!: PropertyDto;

  @ApiProperty({ type: MoneyDto })
  serviceFee!: MoneyDto;

  @ApiProperty()
  listingAgentId!: string;

  @ApiProperty()
  sellingAgentId!: string;

  @ApiProperty({ example: 'agreement' })
  stage!: Stage;

  @ApiProperty({ type: StageHistoryDto, isArray: true })
  stageHistory!: StageHistoryDto[];

  @ApiProperty({ nullable: true, example: null })
  completedAt!: string | null;

  @ApiProperty()
  createdAt!: string;
}
```

- [ ] **Step 4: Write `backend/src/modules/transactions/transactions.service.ts`**

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name) private readonly txModel: Model<TransactionDocument>,
  ) {}

  async create(dto: CreateTransactionDto): Promise<TransactionResponseDto> {
    const now = new Date();
    const created = await this.txModel.create({
      property: dto.property,
      serviceFee: dto.serviceFee,
      listingAgentId: new Types.ObjectId(dto.listingAgentId),
      sellingAgentId: new Types.ObjectId(dto.sellingAgentId),
      stage: 'agreement',
      stageHistory: [{ from: null, to: 'agreement', at: now }],
      completedAt: null,
    });
    return this.toResponse(created);
  }

  async findAll(stage?: string): Promise<TransactionResponseDto[]> {
    const filter = stage ? { stage } : {};
    const docs = await this.txModel.find(filter).sort({ createdAt: -1 }).exec();
    return docs.map((d) => this.toResponse(d));
  }

  async findById(id: string): Promise<TransactionResponseDto> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }
    const doc = await this.txModel.findById(id).exec();
    if (!doc) throw new NotFoundException(`Transaction ${id} not found`);
    return this.toResponse(doc);
  }

  private toResponse(doc: TransactionDocument): TransactionResponseDto {
    const plain = doc.toObject({ versionKey: false });
    return {
      id: String(plain._id),
      property: plain.property,
      serviceFee: plain.serviceFee,
      listingAgentId: String(plain.listingAgentId),
      sellingAgentId: String(plain.sellingAgentId),
      stage: plain.stage,
      stageHistory: plain.stageHistory.map((h: { from: string | null; to: string; at: Date; note?: string }) => ({
        from: h.from,
        to: h.to,
        at: h.at.toISOString(),
        note: h.note,
      })) as TransactionResponseDto['stageHistory'],
      completedAt: plain.completedAt ? plain.completedAt.toISOString() : null,
      createdAt: (plain as unknown as { createdAt: Date }).createdAt.toISOString(),
    };
  }
}
```

- [ ] **Step 5: Write `backend/src/modules/transactions/transactions.service.spec.ts`**

```ts
import { Test } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { TransactionsService } from './transactions.service';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';

describe('TransactionsService', () => {
  let mongo: MongoMemoryServer;
  let service: TransactionsService;
  const listingId = new Types.ObjectId().toHexString();
  const sellingId = new Types.ObjectId().toHexString();

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongo.getUri()),
        MongooseModule.forFeature([{ name: Transaction.name, schema: TransactionSchema }]),
      ],
      providers: [TransactionsService],
    }).compile();
    service = module.get(TransactionsService);
  });

  afterAll(async () => {
    await mongo.stop();
  });

  it('creates a transaction at the agreement stage with a history entry', async () => {
    const tx = await service.create({
      property: { address: 'Kadıköy', type: 'sale', listPrice: { amount: 10_000_000, currency: 'TRY' } },
      serviceFee: { amount: 1_000_000, currency: 'TRY' },
      listingAgentId: listingId,
      sellingAgentId: sellingId,
    });
    expect(tx.stage).toBe('agreement');
    expect(tx.stageHistory).toHaveLength(1);
    expect(tx.stageHistory[0]).toMatchObject({ from: null, to: 'agreement' });
    expect(tx.completedAt).toBeNull();
  });

  it('lists transactions newest first', async () => {
    const list = await service.findAll();
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].stage).toBe('agreement');
  });

  it('rejects malformed ids with NotFoundException', async () => {
    await expect(service.findById('xxx')).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [ ] **Step 6: Write `backend/src/modules/transactions/transactions.controller.ts`**

```ts
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { STAGES } from './state-machine';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a transaction (starts in agreement stage)' })
  @ApiResponse({ status: 201, type: TransactionResponseDto })
  create(@Body() dto: CreateTransactionDto): Promise<TransactionResponseDto> {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List transactions, optionally filtered by stage' })
  @ApiQuery({ name: 'stage', required: false, enum: STAGES })
  @ApiResponse({ status: 200, type: TransactionResponseDto, isArray: true })
  findAll(@Query('stage') stage?: string): Promise<TransactionResponseDto[]> {
    return this.service.findAll(stage);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transaction with its stage history' })
  @ApiResponse({ status: 200, type: TransactionResponseDto })
  findById(@Param('id') id: string): Promise<TransactionResponseDto> {
    return this.service.findById(id);
  }
}
```

- [ ] **Step 7: Write `backend/src/modules/transactions/transactions.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Transaction.name, schema: TransactionSchema }])],
  providers: [TransactionsService],
  controllers: [TransactionsController],
  exports: [TransactionsService],
})
export class TransactionsModule {}
```

- [ ] **Step 8: Register `TransactionsModule` in `backend/src/app.module.ts`**

Add `TransactionsModule` to the imports array — after `AgentsModule`:

```ts
import { TransactionsModule } from './modules/transactions/transactions.module';
// ...
imports: [
  ConfigModule.forRoot({ /* ... */ }),
  MongooseModule.forRootAsync({ /* ... */ }),
  AgentsModule,
  TransactionsModule,
],
```

- [ ] **Step 9: Run tests and build**

```bash
cd backend
npm run test
npm run build
cd ..
```
Expected: all green.

- [ ] **Step 10: Commit**

```bash
git add backend/
git commit -m "feat(backend): add transactions module with CRUD (no transition yet)"
git push
```

---

## Task 7: Commission Breakdowns Module (schema, service, controller, unit tests)

**Files:**
- Create: `backend/src/modules/commissions/schemas/commission-breakdown.schema.ts`
- Create: `backend/src/modules/commissions/dto/breakdown-response.dto.ts`
- Create: `backend/src/modules/commissions/commissions.service.ts`
- Create: `backend/src/modules/commissions/commissions.service.spec.ts`
- Create: `backend/src/modules/commissions/commissions.controller.ts`
- Create: `backend/src/modules/commissions/commissions.module.ts`
- Modify: `backend/src/app.module.ts` (register `CommissionsModule`)

- [ ] **Step 1: Write `backend/src/modules/commissions/schemas/commission-breakdown.schema.ts`**

```ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MoneyEmbedded, MoneyEmbeddedSchema } from '../../transactions/schemas/transaction.schema';

export type CommissionBreakdownDocument = HydratedDocument<CommissionBreakdown>;

@Schema({ _id: false })
export class AgentShareEmbedded {
  @Prop({ required: true, type: Types.ObjectId })
  agentId!: Types.ObjectId;

  @Prop({ required: true, enum: ['listing', 'selling', 'dual'] })
  role!: 'listing' | 'selling' | 'dual';

  @Prop({ required: true, type: MoneyEmbeddedSchema })
  amount!: MoneyEmbedded;

  @Prop({ required: true })
  percentage!: number;

  @Prop({ required: true })
  rationale!: string;
}
export const AgentShareEmbeddedSchema = SchemaFactory.createForClass(AgentShareEmbedded);

@Schema({ collection: 'commission_breakdowns', timestamps: { createdAt: 'computedAt', updatedAt: false } })
export class CommissionBreakdown {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Transaction', unique: true })
  transactionId!: Types.ObjectId;

  @Prop({ required: true, type: MoneyEmbeddedSchema })
  totalFee!: MoneyEmbedded;

  @Prop({ required: true, type: MoneyEmbeddedSchema })
  agencyShare!: MoneyEmbedded;

  @Prop({ required: true, type: [AgentShareEmbeddedSchema], default: [] })
  agentShares!: AgentShareEmbedded[];

  @Prop({ required: true, enum: ['same_agent', 'different_agents'] })
  scenario!: 'same_agent' | 'different_agents';
}

export const CommissionBreakdownSchema = SchemaFactory.createForClass(CommissionBreakdown);
```

- [ ] **Step 2: Write `backend/src/modules/commissions/dto/breakdown-response.dto.ts`**

```ts
import { ApiProperty } from '@nestjs/swagger';
import { MoneyDto } from '../../transactions/dto/create-transaction.dto';

export class AgentShareResponseDto {
  @ApiProperty()
  agentId!: string;

  @ApiProperty({ enum: ['listing', 'selling', 'dual'] })
  role!: 'listing' | 'selling' | 'dual';

  @ApiProperty({ type: MoneyDto })
  amount!: MoneyDto;

  @ApiProperty({ example: 25 })
  percentage!: number;

  @ApiProperty()
  rationale!: string;
}

export class BreakdownResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  transactionId!: string;

  @ApiProperty({ type: MoneyDto })
  totalFee!: MoneyDto;

  @ApiProperty({ type: MoneyDto })
  agencyShare!: MoneyDto;

  @ApiProperty({ type: AgentShareResponseDto, isArray: true })
  agentShares!: AgentShareResponseDto[];

  @ApiProperty({ enum: ['same_agent', 'different_agents'] })
  scenario!: 'same_agent' | 'different_agents';

  @ApiProperty({ example: '2026-04-19T10:00:00.000Z' })
  computedAt!: string;
}
```

- [ ] **Step 3: Write `backend/src/modules/commissions/commissions.service.ts`**

```ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import { CommissionBreakdown, CommissionBreakdownDocument } from './schemas/commission-breakdown.schema';
import { BreakdownResponseDto } from './dto/breakdown-response.dto';
import { compute, CommissionResult } from './engine';
import { Money } from '../../common/money';

export interface WriteBreakdownInput {
  transactionId: Types.ObjectId;
  totalFee: Money;
  listingAgentId: Types.ObjectId;
  sellingAgentId: Types.ObjectId;
}

@Injectable()
export class CommissionsService {
  constructor(
    @InjectModel(CommissionBreakdown.name)
    private readonly model: Model<CommissionBreakdownDocument>,
  ) {}

  /** Compute and persist a breakdown exactly once for a transaction. Idempotent by transactionId. */
  async writeForTransaction(input: WriteBreakdownInput): Promise<BreakdownResponseDto> {
    const existing = await this.model.findOne({ transactionId: input.transactionId }).exec();
    if (existing) {
      throw new ConflictException(
        `Commission breakdown already exists for transaction ${String(input.transactionId)}`,
      );
    }

    const result: CommissionResult = compute({
      totalFee: input.totalFee,
      listingAgentId: String(input.listingAgentId),
      sellingAgentId: String(input.sellingAgentId),
    });

    const doc = await this.model.create({
      transactionId: input.transactionId,
      totalFee: { amount: result.totalFee.amount, currency: result.totalFee.currency },
      agencyShare: { amount: result.agencyShare.amount, currency: result.agencyShare.currency },
      agentShares: result.agentShares.map((s) => ({
        agentId: new Types.ObjectId(s.agentId),
        role: s.role,
        amount: { amount: s.amount.amount, currency: s.amount.currency },
        percentage: s.percentage,
        rationale: s.rationale,
      })),
      scenario: result.scenario,
    });

    return this.toResponse(doc);
  }

  async findByTransactionId(transactionId: string): Promise<BreakdownResponseDto> {
    if (!isValidObjectId(transactionId)) {
      throw new NotFoundException(`Breakdown for transaction ${transactionId} not found`);
    }
    const doc = await this.model.findOne({ transactionId: new Types.ObjectId(transactionId) }).exec();
    if (!doc) {
      throw new NotFoundException(`Breakdown for transaction ${transactionId} not found`);
    }
    return this.toResponse(doc);
  }

  private toResponse(doc: CommissionBreakdownDocument): BreakdownResponseDto {
    const plain = doc.toObject({ versionKey: false });
    return {
      id: String(plain._id),
      transactionId: String(plain.transactionId),
      totalFee: plain.totalFee,
      agencyShare: plain.agencyShare,
      agentShares: plain.agentShares.map((s: { agentId: Types.ObjectId; role: string; amount: { amount: number; currency: 'TRY' }; percentage: number; rationale: string }) => ({
        agentId: String(s.agentId),
        role: s.role as 'listing' | 'selling' | 'dual',
        amount: s.amount,
        percentage: s.percentage,
        rationale: s.rationale,
      })),
      scenario: plain.scenario,
      computedAt: (plain as unknown as { computedAt: Date }).computedAt.toISOString(),
    };
  }
}
```

- [ ] **Step 4: Write `backend/src/modules/commissions/commissions.service.spec.ts`**

```ts
import { Test } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CommissionsService } from './commissions.service';
import { CommissionBreakdown, CommissionBreakdownSchema } from './schemas/commission-breakdown.schema';
import { Money } from '../../common/money';

describe('CommissionsService', () => {
  let mongo: MongoMemoryServer;
  let service: CommissionsService;

  const txId = new Types.ObjectId();
  const listing = new Types.ObjectId();
  const selling = new Types.ObjectId();

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongo.getUri()),
        MongooseModule.forFeature([
          { name: CommissionBreakdown.name, schema: CommissionBreakdownSchema },
        ]),
      ],
      providers: [CommissionsService],
    }).compile();
    service = module.get(CommissionsService);
  });

  afterAll(async () => {
    await mongo.stop();
  });

  it('writes a breakdown for a different-agents scenario', async () => {
    const dto = await service.writeForTransaction({
      transactionId: txId,
      totalFee: Money.of(1_000_000, 'TRY'),
      listingAgentId: listing,
      sellingAgentId: selling,
    });
    expect(dto.scenario).toBe('different_agents');
    expect(dto.agencyShare.amount).toBe(500_000);
    expect(dto.agentShares).toHaveLength(2);
    expect(dto.agentShares.map((s) => s.amount.amount)).toEqual([250_000, 250_000]);
  });

  it('refuses to recompute for the same transaction (immutability)', async () => {
    await expect(
      service.writeForTransaction({
        transactionId: txId,
        totalFee: Money.of(2_000_000, 'TRY'),
        listingAgentId: listing,
        sellingAgentId: selling,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('finds a breakdown by transactionId', async () => {
    const dto = await service.findByTransactionId(String(txId));
    expect(dto.transactionId).toBe(String(txId));
  });

  it('returns NotFoundException for an unknown transactionId', async () => {
    await expect(service.findByTransactionId(String(new Types.ObjectId()))).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns NotFoundException for a malformed transactionId', async () => {
    await expect(service.findByTransactionId('not-an-id')).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [ ] **Step 5: Write `backend/src/modules/commissions/commissions.controller.ts`**

```ts
import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CommissionsService } from './commissions.service';
import { BreakdownResponseDto } from './dto/breakdown-response.dto';

@ApiTags('commissions')
@Controller()
export class CommissionsController {
  constructor(private readonly service: CommissionsService) {}

  @Get('transactions/:id/breakdown')
  @ApiOperation({ summary: 'Get the commission breakdown for a completed transaction' })
  @ApiResponse({ status: 200, type: BreakdownResponseDto })
  @ApiResponse({ status: 404, description: 'Transaction not completed or not found' })
  findByTransaction(@Param('id') id: string): Promise<BreakdownResponseDto> {
    return this.service.findByTransactionId(id);
  }
}
```

- [ ] **Step 6: Write `backend/src/modules/commissions/commissions.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommissionBreakdown, CommissionBreakdownSchema } from './schemas/commission-breakdown.schema';
import { CommissionsService } from './commissions.service';
import { CommissionsController } from './commissions.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CommissionBreakdown.name, schema: CommissionBreakdownSchema },
    ]),
  ],
  providers: [CommissionsService],
  controllers: [CommissionsController],
  exports: [CommissionsService],
})
export class CommissionsModule {}
```

- [ ] **Step 7: Register `CommissionsModule` in `backend/src/app.module.ts`**

Add `CommissionsModule` to imports after `TransactionsModule`:

```ts
import { CommissionsModule } from './modules/commissions/commissions.module';
// ...
imports: [..., AgentsModule, TransactionsModule, CommissionsModule],
```

- [ ] **Step 8: Run tests and build**

```bash
cd backend
npm run test
npm run build
cd ..
```

- [ ] **Step 9: Commit**

```bash
git add backend/
git commit -m "feat(backend): add commissions module with immutable breakdown persistence"
git push
```

---

## Task 8: Wire the Transition Endpoint (state machine → commission engine flow)

**Files:**
- Modify: `backend/src/modules/transactions/transactions.service.ts`
- Modify: `backend/src/modules/transactions/transactions.controller.ts`
- Modify: `backend/src/modules/transactions/transactions.module.ts`
- Create: `backend/src/modules/transactions/dto/transition.dto.ts`
- Create: `backend/src/modules/transactions/transactions.transition.spec.ts`

- [ ] **Step 1: Write `backend/src/modules/transactions/dto/transition.dto.ts`**

```ts
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { STAGES, Stage } from '../state-machine';

export class TransitionDto {
  @ApiProperty({ enum: STAGES, example: 'earnest_money' })
  @IsEnum(STAGES)
  toStage!: Stage;

  @ApiProperty({ required: false, example: 'Earnest money received from buyer' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
```

- [ ] **Step 2: Extend `TransactionsService` to support `transition`**

Replace `backend/src/modules/transactions/transactions.service.ts` with:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import { Transaction, TransactionDocument } from './schemas/transaction.schema';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { TransitionDto } from './dto/transition.dto';
import { assertValidTransition, isTerminal } from './state-machine';
import { CommissionsService } from '../commissions/commissions.service';
import { Money } from '../../common/money';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name) private readonly txModel: Model<TransactionDocument>,
    private readonly commissions: CommissionsService,
  ) {}

  async create(dto: CreateTransactionDto): Promise<TransactionResponseDto> {
    const now = new Date();
    const created = await this.txModel.create({
      property: dto.property,
      serviceFee: dto.serviceFee,
      listingAgentId: new Types.ObjectId(dto.listingAgentId),
      sellingAgentId: new Types.ObjectId(dto.sellingAgentId),
      stage: 'agreement',
      stageHistory: [{ from: null, to: 'agreement', at: now }],
      completedAt: null,
    });
    return this.toResponse(created);
  }

  async findAll(stage?: string): Promise<TransactionResponseDto[]> {
    const filter = stage ? { stage } : {};
    const docs = await this.txModel.find(filter).sort({ createdAt: -1 }).exec();
    return docs.map((d) => this.toResponse(d));
  }

  async findById(id: string): Promise<TransactionResponseDto> {
    const doc = await this.getDocumentOrFail(id);
    return this.toResponse(doc);
  }

  async transition(id: string, dto: TransitionDto): Promise<TransactionResponseDto> {
    const doc = await this.getDocumentOrFail(id);

    assertValidTransition(doc.stage, dto.toStage);

    const now = new Date();
    doc.stageHistory.push({ from: doc.stage, to: dto.toStage, at: now, note: dto.note });
    doc.stage = dto.toStage;

    if (isTerminal(dto.toStage)) {
      doc.completedAt = now;
      await doc.save();
      await this.commissions.writeForTransaction({
        transactionId: doc._id as Types.ObjectId,
        totalFee: Money.of(doc.serviceFee.amount, doc.serviceFee.currency),
        listingAgentId: doc.listingAgentId,
        sellingAgentId: doc.sellingAgentId,
      });
    } else {
      await doc.save();
    }

    return this.toResponse(doc);
  }

  private async getDocumentOrFail(id: string): Promise<TransactionDocument> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }
    const doc = await this.txModel.findById(id).exec();
    if (!doc) throw new NotFoundException(`Transaction ${id} not found`);
    return doc;
  }

  private toResponse(doc: TransactionDocument): TransactionResponseDto {
    const plain = doc.toObject({ versionKey: false });
    return {
      id: String(plain._id),
      property: plain.property,
      serviceFee: plain.serviceFee,
      listingAgentId: String(plain.listingAgentId),
      sellingAgentId: String(plain.sellingAgentId),
      stage: plain.stage,
      stageHistory: plain.stageHistory.map((h: { from: string | null; to: string; at: Date; note?: string }) => ({
        from: h.from as TransactionResponseDto['stageHistory'][number]['from'],
        to: h.to as TransactionResponseDto['stageHistory'][number]['to'],
        at: h.at.toISOString(),
        note: h.note,
      })),
      completedAt: plain.completedAt ? plain.completedAt.toISOString() : null,
      createdAt: (plain as unknown as { createdAt: Date }).createdAt.toISOString(),
    };
  }
}
```

- [ ] **Step 3: Add transition endpoint to `transactions.controller.ts`**

Add inside the controller class (just after `findById`):

```ts
import { HttpCode, HttpStatus } from '@nestjs/common';
import { TransitionDto } from './dto/transition.dto';

@Post(':id/transition')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Transition a transaction to the next stage' })
@ApiResponse({ status: 200, type: TransactionResponseDto })
@ApiResponse({ status: 400, description: 'Invalid stage transition' })
transition(@Param('id') id: string, @Body() dto: TransitionDto): Promise<TransactionResponseDto> {
  return this.service.transition(id, dto);
}
```

Make sure the full imports at the top include `Body`, `Controller`, `Get`, `HttpCode`, `HttpStatus`, `Param`, `Post`, `Query`, plus `TransitionDto`. If any imports were missing after editing, add them.

- [ ] **Step 4: Update `transactions.module.ts` to import `CommissionsModule`**

```ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { CommissionsModule } from '../commissions/commissions.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Transaction.name, schema: TransactionSchema }]),
    CommissionsModule,
  ],
  providers: [TransactionsService],
  controllers: [TransactionsController],
  exports: [TransactionsService],
})
export class TransactionsModule {}
```

- [ ] **Step 5a: Update the original `transactions.service.spec.ts` to register `CommissionsService`**

After Task 8's rewrite, `TransactionsService` now depends on `CommissionsService`. The Task 6 spec currently provides only `TransactionsService`, so it will fail with `Nest can't resolve dependencies of TransactionsService (?)`.

Replace the `Test.createTestingModule` block in `backend/src/modules/transactions/transactions.service.spec.ts` with:

```ts
import { MongooseModule } from '@nestjs/mongoose';
import { CommissionsService } from '../commissions/commissions.service';
import { CommissionBreakdown, CommissionBreakdownSchema } from '../commissions/schemas/commission-breakdown.schema';

// ...
const module = await Test.createTestingModule({
  imports: [
    MongooseModule.forRoot(mongo.getUri()),
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: CommissionBreakdown.name, schema: CommissionBreakdownSchema },
    ]),
  ],
  providers: [TransactionsService, CommissionsService],
}).compile();
```

Leave the existing `it` blocks untouched.

- [ ] **Step 5b: Write `backend/src/modules/transactions/transactions.transition.spec.ts`**

```ts
import { Test } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Types } from 'mongoose';
import { TransactionsService } from './transactions.service';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { CommissionsService } from '../commissions/commissions.service';
import {
  CommissionBreakdown,
  CommissionBreakdownSchema,
} from '../commissions/schemas/commission-breakdown.schema';
import { BusinessError } from '../../common/errors';

describe('TransactionsService.transition', () => {
  let mongo: MongoMemoryServer;
  let service: TransactionsService;
  let commissions: CommissionsService;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongo.getUri()),
        MongooseModule.forFeature([
          { name: Transaction.name, schema: TransactionSchema },
          { name: CommissionBreakdown.name, schema: CommissionBreakdownSchema },
        ]),
      ],
      providers: [TransactionsService, CommissionsService],
    }).compile();
    service = module.get(TransactionsService);
    commissions = module.get(CommissionsService);
  });

  afterAll(async () => {
    await mongo.stop();
  });

  async function createTx(sameAgent = false) {
    const listing = new Types.ObjectId().toHexString();
    const selling = sameAgent ? listing : new Types.ObjectId().toHexString();
    return service.create({
      property: { address: 'Kadıköy', type: 'sale', listPrice: { amount: 10_000_000, currency: 'TRY' } },
      serviceFee: { amount: 1_000_000, currency: 'TRY' },
      listingAgentId: listing,
      sellingAgentId: selling,
    });
  }

  it('walks through the full happy path and writes a breakdown on completion', async () => {
    const tx = await createTx(false);
    const after1 = await service.transition(tx.id, { toStage: 'earnest_money' });
    expect(after1.stage).toBe('earnest_money');
    expect(after1.stageHistory).toHaveLength(2);

    const after2 = await service.transition(tx.id, { toStage: 'title_deed', note: 'deed signed' });
    expect(after2.stage).toBe('title_deed');
    expect(after2.stageHistory.at(-1)?.note).toBe('deed signed');

    const after3 = await service.transition(tx.id, { toStage: 'completed' });
    expect(after3.stage).toBe('completed');
    expect(after3.completedAt).not.toBeNull();

    const breakdown = await commissions.findByTransactionId(tx.id);
    expect(breakdown.scenario).toBe('different_agents');
    expect(breakdown.agencyShare.amount).toBe(500_000);
  });

  it('records the same_agent scenario when listing == selling', async () => {
    const tx = await createTx(true);
    await service.transition(tx.id, { toStage: 'earnest_money' });
    await service.transition(tx.id, { toStage: 'title_deed' });
    await service.transition(tx.id, { toStage: 'completed' });

    const breakdown = await commissions.findByTransactionId(tx.id);
    expect(breakdown.scenario).toBe('same_agent');
    expect(breakdown.agentShares).toHaveLength(1);
    expect(breakdown.agentShares[0].amount.amount).toBe(500_000);
    expect(breakdown.agentShares[0].percentage).toBe(50);
  });

  it('rejects skip-forward transitions with a BusinessError', async () => {
    const tx = await createTx();
    await expect(service.transition(tx.id, { toStage: 'completed' })).rejects.toBeInstanceOf(BusinessError);
  });

  it('rejects backward transitions with a BusinessError', async () => {
    const tx = await createTx();
    await service.transition(tx.id, { toStage: 'earnest_money' });
    await expect(service.transition(tx.id, { toStage: 'agreement' })).rejects.toBeInstanceOf(BusinessError);
  });

  it('rejects a self-transition with a BusinessError', async () => {
    const tx = await createTx();
    await expect(service.transition(tx.id, { toStage: 'agreement' })).rejects.toBeInstanceOf(BusinessError);
  });

  it('rejects further transitions from completed', async () => {
    const tx = await createTx();
    await service.transition(tx.id, { toStage: 'earnest_money' });
    await service.transition(tx.id, { toStage: 'title_deed' });
    await service.transition(tx.id, { toStage: 'completed' });
    await expect(service.transition(tx.id, { toStage: 'agreement' })).rejects.toBeInstanceOf(BusinessError);
  });
});
```

- [ ] **Step 6: Run tests and build**

```bash
cd backend
npm run test
npm run build
cd ..
```
Expected: all suites green — including both transactions service specs and the new transition spec.

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "feat(backend): wire transition endpoint with state machine + commission write"
git push
```

---

## Task 9: Reports Module (agent/agency earnings aggregation)

**Files:**
- Create: `backend/src/modules/reports/dto/earnings-query.dto.ts`
- Create: `backend/src/modules/reports/dto/earnings-response.dto.ts`
- Create: `backend/src/modules/reports/reports.service.ts`
- Create: `backend/src/modules/reports/reports.service.spec.ts`
- Create: `backend/src/modules/reports/reports.controller.ts`
- Create: `backend/src/modules/reports/reports.module.ts`
- Modify: `backend/src/app.module.ts` (register `ReportsModule`)

- [ ] **Step 1: Write `backend/src/modules/reports/dto/earnings-query.dto.ts`**

```ts
import { IsDateString, IsMongoId, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class EarningsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by agent id' })
  @IsOptional()
  @IsMongoId()
  agentId?: string;

  @ApiPropertyOptional({ description: 'Inclusive lower bound on completedAt (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Exclusive upper bound on completedAt (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
```

- [ ] **Step 2: Write `backend/src/modules/reports/dto/earnings-response.dto.ts`**

```ts
import { ApiProperty } from '@nestjs/swagger';
import { MoneyDto } from '../../transactions/dto/create-transaction.dto';

export class AgentEarningsDto {
  @ApiProperty()
  agentId!: string;

  @ApiProperty({ type: MoneyDto })
  total!: MoneyDto;

  @ApiProperty({ example: 12 })
  transactionCount!: number;
}

export class EarningsReportDto {
  @ApiProperty({ type: MoneyDto })
  agencyTotal!: MoneyDto;

  @ApiProperty({ type: AgentEarningsDto, isArray: true })
  agents!: AgentEarningsDto[];
}
```

- [ ] **Step 3: Write `backend/src/modules/reports/reports.service.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { CommissionBreakdown, CommissionBreakdownDocument } from '../commissions/schemas/commission-breakdown.schema';
import { EarningsQueryDto } from './dto/earnings-query.dto';
import { EarningsReportDto } from './dto/earnings-response.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(CommissionBreakdown.name)
    private readonly model: Model<CommissionBreakdownDocument>,
  ) {}

  async getEarnings(query: EarningsQueryDto): Promise<EarningsReportDto> {
    const filter: FilterQuery<CommissionBreakdownDocument> = {};
    if (query.from || query.to) {
      filter.computedAt = {};
      if (query.from) filter.computedAt.$gte = new Date(query.from);
      if (query.to) filter.computedAt.$lt = new Date(query.to);
    }
    if (query.agentId) {
      filter['agentShares.agentId'] = new Types.ObjectId(query.agentId);
    }

    const docs = await this.model.find(filter).lean().exec();

    let agencyAmount = 0;
    const byAgent = new Map<string, { amount: number; count: number }>();
    for (const doc of docs) {
      agencyAmount += doc.agencyShare.amount;
      for (const share of doc.agentShares) {
        const id = String(share.agentId);
        if (query.agentId && id !== query.agentId) continue;
        const prev = byAgent.get(id) ?? { amount: 0, count: 0 };
        byAgent.set(id, { amount: prev.amount + share.amount.amount, count: prev.count + 1 });
      }
    }

    return {
      agencyTotal: { amount: agencyAmount, currency: 'TRY' },
      agents: [...byAgent.entries()].map(([agentId, v]) => ({
        agentId,
        total: { amount: v.amount, currency: 'TRY' },
        transactionCount: v.count,
      })),
    };
  }
}
```

- [ ] **Step 4: Write `backend/src/modules/reports/reports.service.spec.ts`**

```ts
import { Test } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Types } from 'mongoose';
import { ReportsService } from './reports.service';
import { CommissionBreakdown, CommissionBreakdownSchema } from '../commissions/schemas/commission-breakdown.schema';

describe('ReportsService', () => {
  let mongo: MongoMemoryServer;
  let service: ReportsService;
  let model: any;

  const agentA = new Types.ObjectId();
  const agentB = new Types.ObjectId();

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongo.getUri()),
        MongooseModule.forFeature([
          { name: CommissionBreakdown.name, schema: CommissionBreakdownSchema },
        ]),
      ],
      providers: [ReportsService],
    }).compile();
    service = module.get(ReportsService);
    model = module.get(`${CommissionBreakdown.name}Model`);
  });

  afterAll(async () => {
    await mongo.stop();
  });

  async function seedBreakdown(listing: Types.ObjectId, selling: Types.ObjectId, totalMinor: number) {
    const scenario = listing.equals(selling) ? 'same_agent' : 'different_agents';
    const agency = Math.floor(totalMinor / 2);
    const agentPortion = totalMinor - agency;
    const shares =
      scenario === 'same_agent'
        ? [{ agentId: listing, role: 'dual', amount: { amount: agentPortion, currency: 'TRY' }, percentage: 50, rationale: '' }]
        : [
            { agentId: listing, role: 'listing', amount: { amount: Math.ceil(agentPortion / 2), currency: 'TRY' }, percentage: 25, rationale: '' },
            { agentId: selling, role: 'selling', amount: { amount: Math.floor(agentPortion / 2), currency: 'TRY' }, percentage: 25, rationale: '' },
          ];
    await model.create({
      transactionId: new Types.ObjectId(),
      totalFee: { amount: totalMinor, currency: 'TRY' },
      agencyShare: { amount: agency, currency: 'TRY' },
      agentShares: shares,
      scenario,
    });
  }

  it('aggregates agency and per-agent earnings across breakdowns', async () => {
    await seedBreakdown(agentA, agentB, 1_000_000); // A + B each 250_000, agency 500_000
    await seedBreakdown(agentA, agentA, 2_000_000); // A dual 1_000_000, agency 1_000_000

    const report = await service.getEarnings({});
    expect(report.agencyTotal.amount).toBe(1_500_000);
    const byId = new Map(report.agents.map((a) => [a.agentId, a]));
    expect(byId.get(String(agentA))!.total.amount).toBe(1_250_000);
    expect(byId.get(String(agentA))!.transactionCount).toBe(2);
    expect(byId.get(String(agentB))!.total.amount).toBe(250_000);
  });

  it('filters by agentId (only that agent appears)', async () => {
    const report = await service.getEarnings({ agentId: String(agentB) });
    expect(report.agents).toHaveLength(1);
    expect(report.agents[0].agentId).toBe(String(agentB));
  });
});
```

- [ ] **Step 5: Write `backend/src/modules/reports/reports.controller.ts`**

```ts
import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { EarningsQueryDto } from './dto/earnings-query.dto';
import { EarningsReportDto } from './dto/earnings-response.dto';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('earnings')
  @ApiOperation({ summary: 'Aggregate agency and agent earnings from completed transactions' })
  @ApiResponse({ status: 200, type: EarningsReportDto })
  getEarnings(@Query() query: EarningsQueryDto): Promise<EarningsReportDto> {
    return this.service.getEarnings(query);
  }
}
```

- [ ] **Step 6: Write `backend/src/modules/reports/reports.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommissionBreakdown, CommissionBreakdownSchema } from '../commissions/schemas/commission-breakdown.schema';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CommissionBreakdown.name, schema: CommissionBreakdownSchema },
    ]),
  ],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
```

- [ ] **Step 7: Register in `app.module.ts`**

Add `ReportsModule` to imports after `CommissionsModule`.

- [ ] **Step 8: Run tests and build**

```bash
cd backend
npm run test
npm run build
cd ..
```

- [ ] **Step 9: Commit**

```bash
git add backend/
git commit -m "feat(backend): add reports module for agency + agent earnings"
git push
```

---

## Task 10: Health Module

**Files:**
- Create: `backend/src/health/health.controller.ts`
- Create: `backend/src/health/health.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Write `backend/src/health/health.controller.ts`**

```ts
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200 })
  check(): { status: 'ok'; uptime: number; timestamp: string } {
    return { status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() };
  }
}
```

- [ ] **Step 2: Write `backend/src/health/health.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({ controllers: [HealthController] })
export class HealthModule {}
```

- [ ] **Step 3: Register `HealthModule` in `app.module.ts`**

Add it to imports (top of the list, before DB modules).

- [ ] **Step 4: Run tests + build**

```bash
cd backend && npm run test && npm run build && cd ..
```

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "feat(backend): add /health endpoint"
git push
```

---

## Task 11: Seed Script (5 agents)

**Files:**
- Create: `backend/scripts/seed.ts`
- Modify: `backend/package.json` (add `seed` script + `ts-node` dev dep if missing)

- [ ] **Step 1: Ensure `ts-node` is available**

```bash
cd backend && npm ls ts-node || npm install --save-dev ts-node
cd ..
```

- [ ] **Step 2: Write `backend/scripts/seed.ts`**

```ts
import 'dotenv/config';
import mongoose from 'mongoose';
import { AgentSchema } from '../src/modules/agents/schemas/agent.schema';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is required');
  process.exit(1);
}

async function main() {
  await mongoose.connect(uri!);
  const AgentModel = mongoose.model('Agent', AgentSchema);

  const seedAgents = [
    { name: 'Ayşe Yılmaz', email: 'ayse@iceberg.example' },
    { name: 'Burak Demir', email: 'burak@iceberg.example' },
    { name: 'Ceren Kaya', email: 'ceren@iceberg.example' },
    { name: 'Deniz Arslan', email: 'deniz@iceberg.example' },
    { name: 'Elif Şahin', email: 'elif@iceberg.example' },
  ];

  for (const agent of seedAgents) {
    await AgentModel.updateOne({ email: agent.email }, { $setOnInsert: agent }, { upsert: true });
  }

  const count = await AgentModel.countDocuments();
  console.log(`Seed complete. Total agents: ${count}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Add `seed` script and `dotenv` dep**

Add to `backend/package.json` under `scripts`:
```json
"seed": "ts-node --transpile-only scripts/seed.ts"
```

Install `dotenv` (runtime):
```bash
cd backend && npm install dotenv && cd ..
```

- [ ] **Step 4: Commit**

```bash
git add backend/
git commit -m "feat(backend): add seed script for initial agent roster"
git push
```

---

## Task 12: E2E Contract Tests

**Files:**
- Create: `backend/test/agents.e2e-spec.ts`
- Create: `backend/test/transactions.e2e-spec.ts`
- Create: `backend/test/commissions.e2e-spec.ts`
- Modify: `backend/test/jest-e2e.json` (ensure config picks up new tests)

- [ ] **Step 1: Create shared test bootstrap `backend/test/bootstrap.ts`**

```ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AgentsModule } from '../src/modules/agents/agents.module';
import { TransactionsModule } from '../src/modules/transactions/transactions.module';
import { CommissionsModule } from '../src/modules/commissions/commissions.module';
import { ReportsModule } from '../src/modules/reports/reports.module';
import { HealthModule } from '../src/health/health.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

export async function bootstrap(): Promise<{ app: INestApplication; mongo: MongoMemoryServer }> {
  const mongo = await MongoMemoryServer.create();
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
      MongooseModule.forRootAsync({
        inject: [ConfigService],
        useFactory: () => ({ uri: mongo.getUri() }),
      }),
      HealthModule,
      AgentsModule,
      TransactionsModule,
      CommissionsModule,
      ReportsModule,
    ],
  }).compile();

  const app = module.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();

  return { app, mongo };
}
```

- [ ] **Step 2: Write `backend/test/agents.e2e-spec.ts`**

```ts
import request from 'supertest';
import { bootstrap } from './bootstrap';

describe('Agents (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof bootstrap>>;

  beforeAll(async () => {
    ctx = await bootstrap();
  });

  afterAll(async () => {
    await ctx.app.close();
    await ctx.mongo.stop();
  });

  it('creates and lists agents', async () => {
    const created = await request(ctx.app.getHttpServer())
      .post('/agents')
      .send({ name: 'Ayşe Yılmaz', email: 'ayse@iceberg.example' })
      .expect(201);
    expect(created.body.id).toBeDefined();

    const list = await request(ctx.app.getHttpServer()).get('/agents').expect(200);
    expect(list.body).toHaveLength(1);
  });

  it('rejects invalid email with 400 and structured error', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/agents')
      .send({ name: 'Invalid', email: 'not-an-email' })
      .expect(400);
    expect(res.body.statusCode).toBe(400);
  });
});
```

- [ ] **Step 3: Write `backend/test/transactions.e2e-spec.ts`**

```ts
import request from 'supertest';
import { bootstrap } from './bootstrap';

describe('Transactions (e2e)', () => {
  let ctx: Awaited<ReturnType<typeof bootstrap>>;
  let listingId: string;
  let sellingId: string;

  beforeAll(async () => {
    ctx = await bootstrap();
    const a1 = await request(ctx.app.getHttpServer())
      .post('/agents')
      .send({ name: 'A One', email: 'a1@ex.com' });
    const a2 = await request(ctx.app.getHttpServer())
      .post('/agents')
      .send({ name: 'A Two', email: 'a2@ex.com' });
    listingId = a1.body.id;
    sellingId = a2.body.id;
  });

  afterAll(async () => {
    await ctx.app.close();
    await ctx.mongo.stop();
  });

  it('creates a transaction and walks it through all stages', async () => {
    const create = await request(ctx.app.getHttpServer())
      .post('/transactions')
      .send({
        property: { address: 'Kadıköy', type: 'sale', listPrice: { amount: 10_000_000, currency: 'TRY' } },
        serviceFee: { amount: 1_000_000, currency: 'TRY' },
        listingAgentId: listingId,
        sellingAgentId: sellingId,
      })
      .expect(201);
    const id = create.body.id;

    for (const stage of ['earnest_money', 'title_deed', 'completed']) {
      await request(ctx.app.getHttpServer())
        .post(`/transactions/${id}/transition`)
        .send({ toStage: stage })
        .expect(200);
    }

    const breakdown = await request(ctx.app.getHttpServer())
      .get(`/transactions/${id}/breakdown`)
      .expect(200);
    expect(breakdown.body.scenario).toBe('different_agents');
    expect(breakdown.body.agencyShare.amount).toBe(500_000);
  });

  it('returns 400 when trying to skip forward', async () => {
    const create = await request(ctx.app.getHttpServer())
      .post('/transactions')
      .send({
        property: { address: 'Bakırköy', type: 'sale', listPrice: { amount: 5_000_000, currency: 'TRY' } },
        serviceFee: { amount: 500_000, currency: 'TRY' },
        listingAgentId: listingId,
        sellingAgentId: sellingId,
      });
    await request(ctx.app.getHttpServer())
      .post(`/transactions/${create.body.id}/transition`)
      .send({ toStage: 'completed' })
      .expect(400)
      .expect((r) => {
        expect(r.body.code).toBe('invalid_transition');
      });
  });
});
```

- [ ] **Step 4: Install `supertest` (already present from Nest scaffold; verify)**

```bash
cd backend && npm ls supertest 2>/dev/null | head -2 || npm install --save-dev supertest @types/supertest
cd ..
```

- [ ] **Step 5: Run E2E tests**

```bash
cd backend && npm run test:e2e
cd ..
```
Expected: all specs green.

- [ ] **Step 6: Commit**

```bash
git add backend/test/
git commit -m "test(backend): add e2e contract tests for agents and transactions"
git push
```

---

## Task 13: Render Deploy Configuration (`render.yaml` + env doc)

**Files:**
- Create: `backend/render.yaml`
- Modify: `backend/.env.example` (ensure current keys listed)

- [ ] **Step 1: Write `backend/render.yaml` blueprint**

```yaml
services:
  - type: web
    name: iceberg-api
    env: node
    plan: free
    region: frankfurt
    rootDir: backend
    buildCommand: npm ci && npm run build
    startCommand: node dist/main.js
    autoDeploy: true
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: MONGODB_URI
        sync: false
      - key: CORS_ORIGIN
        sync: false
```

Note: `sync: false` tells Render to require the value be set in the dashboard (not committed to the YAML).

- [ ] **Step 2: Commit**

```bash
git add backend/render.yaml
git commit -m "feat(backend): add Render blueprint (free tier, frankfurt, auto-deploy)"
git push
```

---

## Task 14: Deploy to Render + Wire Atlas (Manual/MCP Step)

This task requires external service access. If the Render MCP server is wired up (Plan 1 deferred this; pull the API key from `.claude/settings.local.json._notes.renderApiKey`), you can automate. Otherwise do it manually via the Render dashboard.

- [ ] **Step 1: Atlas readiness**

  - Log in to https://cloud.mongodb.com
  - Verify the `icebergdigitaltask` cluster exists
  - Create a database named `iceberg` if not yet present (happens automatically on first write too)
  - Confirm Network Access allows `0.0.0.0/0` (or at least permits Render egress IPs). Record decision in DESIGN.md.
  - Confirm the DB user `ragipgunay09_db_user` has `readWrite` on `iceberg`.
  - Copy the full SRV URI ending in `/iceberg?retryWrites=true&w=majority&appName=Icebergdigitaltask`. This is the value for `MONGODB_URI`.

- [ ] **Step 2: Create the Render service**

  - Dashboard: https://dashboard.render.com → New → Blueprint
  - Connect the GitHub repo `RgpGny/Iceberg-digital-task`, branch `main`
  - Render detects `backend/render.yaml`
  - Click **Apply** to create `iceberg-api`
  - Once the service card loads, open **Environment** and set:
    - `MONGODB_URI` = Atlas URI from Step 1
    - `CORS_ORIGIN` = `http://localhost:3001` (temporary; Plan 3 replaces with the Vercel URL)
  - Save and trigger a deploy

- [ ] **Step 3: Verify deploy**

Once the deploy turns green in the Render dashboard, grab the public URL (e.g. `https://iceberg-api.onrender.com`) and verify:

```bash
curl -fsS https://<your-render-url>/health
curl -fsS https://<your-render-url>/api/docs >/dev/null && echo "swagger-up"
curl -fsS -X POST https://<your-render-url>/agents \
  -H 'content-type: application/json' \
  -d '{"name":"Test","email":"test@example.com"}'
```

Expected:
- `/health` returns `{"status":"ok",...}` JSON
- `swagger-up` prints
- `POST /agents` returns a 201 with `id`

- [ ] **Step 4: Update `README.md` with the live API URL**

Replace the `API:` placeholder line in `README.md` with the actual Render URL, and the Swagger line with `<API URL>/api/docs`.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: record live API URL after first Render deploy"
git push
```

---

## Task 15: Uptime Ping Workflow

**Files:**
- Create: `.github/workflows/uptime-ping.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: Uptime ping

on:
  schedule:
    - cron: '*/10 * * * *'
  workflow_dispatch:

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping /health
        env:
          API_URL: ${{ secrets.RENDER_API_URL }}
        run: |
          if [ -z "$API_URL" ]; then
            echo "RENDER_API_URL secret is not set — skipping ping."
            exit 0
          fi
          curl -fsS --retry 3 --retry-delay 5 "$API_URL/health" >/dev/null
          echo "Pinged $API_URL/health OK"
```

- [ ] **Step 2: Set the `RENDER_API_URL` repo secret**

Via the GitHub UI: Settings → Secrets and variables → Actions → New repository secret
Name: `RENDER_API_URL`
Value: the Render URL from Task 14 (e.g. `https://iceberg-api.onrender.com`)

Or via gh CLI (needs `gh auth login` with repo admin):
```
gh secret set RENDER_API_URL --body "https://iceberg-api.onrender.com"
```

- [ ] **Step 3: Commit + trigger**

```bash
git add .github/workflows/uptime-ping.yml
git commit -m "ci: add GitHub Actions cron to ping /health every 10 min"
git push
```

Then dispatch manually to confirm:
```
gh workflow run "Uptime ping"
gh run watch
```
Expected: green run.

---

## Task 16: Update `backend/README.md`

**Files:**
- Modify: `backend/README.md`

- [ ] **Step 1: Replace `backend/README.md` with:**

```markdown
# Iceberg Transactions — Backend

NestJS 10 + Mongoose 8 + MongoDB Atlas. Exposes REST + Swagger.

## Local dev

    nvm use
    cp .env.example .env     # fill in MONGODB_URI
    npm install
    npm run start:dev        # http://localhost:3000
    npm run test
    npm run test:e2e
    npm run seed             # insert 5 default agents

Swagger: `http://localhost:3000/api/docs`

## Key endpoints

- `GET /health`
- `POST /agents`, `GET /agents`, `GET /agents/:id`
- `POST /transactions`, `GET /transactions?stage=…`, `GET /transactions/:id`
- `POST /transactions/:id/transition` — body `{ toStage, note? }`
- `GET /transactions/:id/breakdown`
- `GET /reports/earnings?agentId=&from=&to=`

## Invariants

- Money is always integer minor units (kuruş).
- State machine is pure and 100 % tested.
- Commission breakdowns are immutable once written.

See repo-root `CLAUDE.md` and `DESIGN.md` for full context.
```

- [ ] **Step 2: Commit**

```bash
git add backend/README.md
git commit -m "docs(backend): document endpoints, scripts, and invariants"
git push
```

---

## Task 17: Final Verification Pass

- [ ] **Step 1: Working tree clean**

```bash
git status --short
```
Expected: empty (except an untracked `.claude/scheduled_tasks.lock`, acceptable).

- [ ] **Step 2: Backend green end to end**

```bash
cd backend
npm run lint
npm run build
npm run test -- --coverage
npm run test:e2e
cd ..
```

Expected:
- Lint exit 0
- Build succeeds
- Coverage: `money`, `state-machine`, `commission-engine` at **100 %**; project overall ≥ 85 % on business logic
- E2E suites pass

- [ ] **Step 3: CI green on GitHub**

```bash
gh run list --branch feat/backend --limit 5
```
Expected: latest run succeeds.

- [ ] **Step 4: Live API responsive**

```bash
curl -fsS "$RENDER_URL/health"
curl -fsS "$RENDER_URL/api/docs" -o /dev/null -w "%{http_code}\n"
```

(`$RENDER_URL` = the Render URL recorded in README.md.)

Expected: `/health` returns JSON, `/api/docs` returns `200`.

- [ ] **Step 5: No secrets in tracked files**

```bash
git grep -E 'rnd_[A-Za-z0-9]+|mongodb\+srv://[^<]*:[^<]*@' -- ':!docs/technical-case.pdf'
```
Expected: no output.

- [ ] **Step 6: Tag v0.1.0-backend**

```bash
git tag -a v0.1.0-backend -m "Backend implementation complete — live on Render"
git push --tags
```

- [ ] **Step 7: Open PR for main merge**

```bash
gh pr create --base main --head feat/backend \
  --title "Plan 2: Backend implementation" \
  --body "Delivers agents, transactions (with state-machine + immutable commission breakdown), reports, health endpoints. Live on Render. 100% coverage on Money, state machine, and commission engine. Closes Plan 2."
```

---

## Done state

- All backend modules land: `common/money`, `common/errors`, `common/filters`, `health`, `agents`, `transactions` (with transitions), `commissions`, `reports`.
- Pure functions at 100 % coverage: `Money`, state machine, commission engine.
- Swagger live at `<API_URL>/api/docs`.
- Render deploy live; `/health` passes; GitHub Actions cron keeps the free dyno warm.
- `README.md` carries the live API URL.
- CI green on `feat/backend`; PR open for merge to `main`.
- Tag: `v0.1.0-backend`.

Next: **Plan 3 — Frontend Implementation** (Pinia stores → pages → components → Playwright E2E → Vercel deploy wired to the live API).
