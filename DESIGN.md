# DESIGN.md — Iceberg Transactions

Architectural reference for the Iceberg Transactions system. Read this alongside `CLAUDE.md` (operating rules) and `docs/superpowers/specs/2026-04-19-iceberg-transactions-design.md` (original approved design spec).

Source brief: `docs/technical-case.pdf`.

---

## 1. Overview

Iceberg Transactions automates the post-agreement lifecycle of an estate-agency property deal. Once buyer and seller reach an agreement, the platform tracks the deal through four mandatory stages (agreement → earnest money → title deed → completed) and, on completion, automatically computes and records the distribution of the service fee between the agency and the agents who originated and closed the deal. The system is intentionally single-tenant with no authentication layer; the focus is correctness of financial logic, state enforcement, and a clear audit trail.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Client Browser                      │
│            Nuxt 3 SPA (Vercel · *.vercel.app)           │
│   Pages: Dashboard / New Transaction / Detail / Reports │
│   State: Pinia stores (agents, transactions, reports)   │
│   API: composables/useApi.ts → $fetch + typed generics  │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS (NUXT_PUBLIC_API_URL)
                        ▼
┌─────────────────────────────────────────────────────────┐
│           NestJS 10 REST API (Render · Frankfurt)       │
│   Port 10000 · /api/docs (Swagger) · /health probe      │
│                                                         │
│  ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌───────┐  │
│  │  agents  │ │ transactions │ │commissions│ │reports│  │
│  └──────────┘ └──────────────┘ └──────────┘ └───────┘  │
│         common/money · common/errors · common/filters   │
└───────────────────────┬─────────────────────────────────┘
                        │ Mongoose 8 (MONGODB_URI)
                        ▼
┌─────────────────────────────────────────────────────────┐
│        MongoDB Atlas M0 — AWS eu-central-1              │
│  Collections: agents · transactions · commission_       │
│               breakdowns                                │
└─────────────────────────────────────────────────────────┘

GitHub Actions cron (*/10 * * * *) → GET /health
(keeps Render free tier warm)
```

**CORS**: The backend reads `CORS_ORIGIN` from its environment and allows only that origin. In production this is set to the Vercel frontend URL.

---

## 3. Data Model

All monetary fields are `Money` value objects — see section below.

### 3.1 Money Value Object

```typescript
// backend/src/common/money/money.types.ts
interface Money {
  amount: number;   // integer kuruş (1 TRY = 100 kuruş). Never a float.
  currency: 'TRY';
}
```

All arithmetic (add, subtract, percentage) lives in `backend/src/common/money/` and is fully unit-tested. Floating-point representation is never used for monetary values anywhere in the system.

### 3.2 agents

```
{
  _id:        ObjectId
  name:       string
  email:      string (unique index)
  createdAt:  Date
  updatedAt:  Date
}
```

Independent agent documents. Transactions reference agents by `ObjectId`. Agents are never embedded in transactions because the same agent can appear in many deals and the agent record may be updated (name, email) independently.

### 3.3 transactions

```
{
  _id:             ObjectId
  property: {
    address:       string
    type:          string         // e.g. 'residential', 'commercial'
    listPrice:     Money
  }
  serviceFee:      Money
  listingAgentId:  ObjectId → agents
  sellingAgentId:  ObjectId → agents
  stage:           'agreement' | 'earnest_money' | 'title_deed' | 'completed'
  stageHistory: [{
    from:          string
    to:            string
    at:            Date
    note?:         string
  }]
  createdAt:       Date
  updatedAt:       Date
  completedAt?:    Date           // set when stage reaches 'completed'
}
```

**Property is embedded** (not a separate collection). A property in a transaction is a historical record — it reflects what was agreed at deal time. Independent property querying is not a requirement of this system.

**Agents are referenced** (ObjectId FK) so that agent profiles remain updatable without touching every historical transaction.

### 3.4 commission_breakdowns

```
{
  _id:           ObjectId
  transactionId: ObjectId → transactions (unique index)
  totalFee:      Money
  agencyShare:   Money
  agentShares: [{
    agentId:     ObjectId
    role:        'listing' | 'selling' | 'listing_and_selling'
    amount:      Money
    percentage:  number           // e.g. 50 = 50%
    rationale:   string           // human-readable rule explanation
  }]
  scenario:      'same_agent' | 'different_agents'
  computedAt:    Date
}
```

Stored in its own collection (not embedded in the transaction) so that:

1. The breakdown can be queried directly without populating the full transaction document.
2. Aggregation pipelines in the reports module can join across `commission_breakdowns` and `agents` without data duplication.
3. The immutability boundary is clear: this document is written exactly once and never updated.

---

## 4. State Machine

### 4.1 Valid transitions

```
agreement → earnest_money → title_deed → completed
```

No stages may be skipped. No backward transitions are permitted. Every valid transition appends an entry to `transaction.stageHistory`.

### 4.2 Pure function

The state machine is implemented as a pure function with no side effects and no database dependency:

```
backend/src/modules/transactions/state-machine/state-machine.ts
  canTransition(from, to): boolean
  nextStages(from): Stage[]
```

Being pure allows exhaustive unit testing with zero setup. The service layer calls `canTransition` before persisting any stage change.

### 4.3 BusinessError

Attempting an invalid transition (backward, skip, or from `completed`) throws a `BusinessError` from `backend/src/common/errors/`. The global `AllExceptionsFilter` maps `BusinessError` to HTTP 400 with a structured body (see section 8).

### 4.4 Completion side effect

When the transition target is `completed`, the service layer:

1. Sets `transaction.completedAt = now`.
2. Calls the commission engine (section 5).
3. Writes the resulting `CommissionBreakdown` document.

This is the only time a breakdown document is created for a transaction.

---

## 5. Commission Engine

### 5.1 Pure function

```
backend/src/modules/commissions/engine/commission-engine.ts
  compute(fee: Money, listingAgentId: ObjectId, sellingAgentId: ObjectId): CommissionBreakdown
```

No database access. No side effects. Called once per transaction lifetime (from the service layer during the → completed transition).

### 5.2 Distribution rules

| Scenario | Agency | Listing agent | Selling agent |
|---|---|---|---|
| Same agent (listing === selling) | 50 % | 50 % | — (same person) |
| Different agents | 50 % | 25 % | 25 % |

All percentages apply to the transaction `serviceFee`. All arithmetic uses integer kuruş via the `common/money` helpers.

### 5.3 Immutability guarantee

Once `compute()` is called and the resulting document is written to `commission_breakdowns`, it is never modified. No endpoint exists to update or recalculate a breakdown. If commission rules change in the future, only new transactions are affected; historical breakdowns remain as they were computed.

---

## 6. Backend Module Structure

```
backend/src/
├── main.ts                     App bootstrap, CORS, global pipes, Swagger setup
├── app.module.ts               Root module — imports all feature modules
├── app.controller.ts           (minimal, health-check delegated to health/)
│
├── common/
│   ├── money/                  Money VO, arithmetic helpers — pure, 100% tested
│   ├── errors/                 BusinessError class
│   └── filters/                AllExceptionsFilter — global exception → HTTP shape
│
├── config/                     Joi env validation schema (MONGODB_URI, PORT, …)
├── health/                     HealthController → GET /health liveness probe
│
└── modules/
    ├── agents/
    │   ├── agents.controller.ts   GET /agents, POST /agents
    │   ├── agents.service.ts      CRUD, uniqueness checks
    │   ├── schemas/               Mongoose Agent schema
    │   └── dto/                   CreateAgentDto, AgentDto
    │
    ├── transactions/
    │   ├── transactions.controller.ts   GET/POST /transactions, GET /:id,
    │   │                               POST /:id/transition
    │   ├── transactions.service.ts      Orchestrates state machine + commission call
    │   ├── transactions.service.spec.ts Integration tests (mongodb-memory-server)
    │   ├── transactions.transition.spec.ts  Pure state machine tests
    │   ├── schemas/               Mongoose Transaction schema (with Money sub-schema)
    │   ├── dto/                   CreateTransactionDto, TransactionDto, TransitionDto
    │   └── state-machine/
    │       └── state-machine.ts   canTransition(), nextStages() — pure functions
    │
    ├── commissions/
    │   ├── commissions.controller.ts   GET /transactions/:id/breakdown
    │   ├── commissions.service.ts      Reads breakdown; called by transactions service
    │   ├── commissions.service.spec.ts Integration tests
    │   ├── schemas/               Mongoose CommissionBreakdown schema
    │   ├── dto/                   CommissionBreakdownDto, AgentShareDto
    │   └── engine/
    │       └── commission-engine.ts   compute() — pure function
    │
    └── reports/
        ├── reports.controller.ts   GET /reports/earnings
        └── reports.service.ts      Aggregation pipeline: earnings per agent, date range
```

---

## 7. API Surface

All endpoints are documented interactively at `GET /api/docs` (Swagger UI).

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Liveness probe — returns `{ status: "ok" }` |
| GET | /agents | List all agents |
| POST | /agents | Create an agent |
| GET | /transactions | List transactions (supports `?stage=` filter) |
| POST | /transactions | Create a transaction (initial stage: `agreement`) |
| GET | /transactions/:id | Get single transaction with populated agents |
| POST | /transactions/:id/transition | Advance stage; body: `{ to: Stage, note? }` |
| GET | /transactions/:id/breakdown | Get commission breakdown (404 until completed) |
| GET | /reports/earnings | Earnings report; query: `agentId?`, `from?`, `to?` |
| GET | /api/docs | Swagger UI |

---

## 8. Error Handling

### 8.1 AllExceptionsFilter

A global NestJS exception filter (`backend/src/common/filters/`) catches every unhandled exception and serialises it to a consistent JSON shape:

```json
{
  "statusCode": 400,
  "code": "INVALID_TRANSITION",
  "message": "Cannot transition from completed to agreement",
  "details": {}
}
```

### 8.2 HTTP status mapping

| Exception type | HTTP status | Notes |
|---|---|---|
| `BusinessError` | 400 | Domain rule violation (invalid transition, etc.) |
| `NotFoundException` | 404 | Agent or transaction not found |
| NestJS `ValidationPipe` error | 422 | DTO validation failure |
| Any other `Error` | 500 | Unexpected server error |

### 8.3 Validation

All incoming request bodies are validated by the NestJS global `ValidationPipe` using `class-validator` decorators on the DTOs. Invalid payloads never reach service or domain logic.

---

## 9. Frontend Architecture

### 9.1 Pages

| Route | File | Purpose |
|---|---|---|
| `/` | `pages/index.vue` | Dashboard — transaction list, stage filter, summary stats |
| `/transactions/new` | `pages/transactions/new.vue` | Create transaction form with agent picker |
| `/transactions/:id` | `pages/transactions/[id].vue` | Transaction detail — timeline, transition button, breakdown card |
| `/reports` | `pages/reports.vue` | Earnings report with agent and date-range filters |

### 9.2 Components

| Component | Responsibility |
|---|---|
| `StageTimeline.vue` | Horizontal 4-stage progress bar; highlights current and completed stages |
| `TransitionButton.vue` | Single button that advances to the next valid stage; disabled on `completed` |
| `CommissionBreakdownCard.vue` | Displays agency share and per-agent amounts; only shown after `completed` |
| `AgentPicker.vue` | Dropdown that loads from the agents store; used in the create form |

### 9.3 Pinia Stores

| Store | File | State owned |
|---|---|---|
| agents | `stores/agents.ts` | Flat list of agents, loading flag |
| transactions | `stores/transactions.ts` | Paginated list, current transaction, current breakdown, active stage filter |
| reports | `stores/reports.ts` | Earnings report result, query parameters (agentId, from, to) |

### 9.4 API Composable

`composables/useApi.ts` is the single point of contact between the frontend and the backend:

- Reads `NUXT_PUBLIC_API_URL` at runtime (injected by Vercel).
- Wraps `$fetch` with typed generics so every call-site is type-safe.
- Maps HTTP error responses from the backend's structured error shape into typed frontend errors.
- No raw `$fetch` calls appear outside this composable.

---

## 10. Testing Strategy

### 10.1 Unit tests — pure functions (100 % coverage required)

| Subject | File | What is covered |
|---|---|---|
| Money arithmetic | `common/money/*.spec.ts` | add, subtract, percentage, integer-only invariant |
| State machine | `transactions/transactions.transition.spec.ts` | All valid transitions, all invalid transitions, `nextStages` output |
| Commission engine | `commissions/commissions.service.spec.ts` (engine section) | Same-agent scenario, different-agents scenario, integer kuruş rounding |

These are pure-function tests — no database, no NestJS application context. Jest runs them in milliseconds.

### 10.2 Integration tests — service layer

Service tests (`*.service.spec.ts`) use `mongodb-memory-server` to spin up an ephemeral in-process MongoDB instance. They test the full service method including Mongoose reads and writes, without HTTP overhead.

```bash
cd backend && npm run test        # all unit + integration
cd backend && npm run test:cov    # with coverage report
```

### 10.3 End-to-end tests — HTTP layer

Supertest-based E2E tests (`npm run test:e2e`) boot the full NestJS application against `mongodb-memory-server` and exercise every endpoint listed in section 7, including error paths (invalid transitions, missing resources).

### 10.4 Frontend

Lint and type-check run via `npm run lint && npm run build` in `frontend/`. Playwright E2E tests cover the critical user journeys (create transaction, advance all stages, view breakdown).

---

## 11. Deployment Topology

| Component | Provider | Region | Config |
|---|---|---|---|
| Frontend | Vercel | Global CDN | Root: `frontend/`, preset: `nuxt`, auto-deploy from `main` |
| Backend | Render (free web service) | Frankfurt (eu-central) | Root: `backend/`, port: 10000, auto-deploy from `main` |
| Database | MongoDB Atlas M0 | AWS eu-central-1 | DB: `iceberg`, network: `0.0.0.0/0` allowlist |
| Uptime ping | GitHub Actions cron | — | `*/10 * * * *` → `GET /health` (mitigates Render cold starts) |

### Environment variables

**Backend (Render)**

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Atlas connection string |
| `CORS_ORIGIN` | Vercel frontend URL |
| `NODE_ENV` | `production` |
| `PORT` | `10000` |

**Frontend (Vercel)**

| Variable | Purpose |
|---|---|
| `NUXT_PUBLIC_API_URL` | Render backend URL |

Secrets never enter git. The Joi config schema in `backend/src/config/` validates that all required variables are present at startup and fails fast if any are missing.

---

## 12. Architectural Decisions

**1. No authentication.**
The PDF brief does not require it. The system is single-tenant. An `AuthModule` extension point is left open in the module structure but nothing is implemented. Adding JWT/session auth later does not require changes to domain logic.

**2. Property embedded in transaction.**
A property in a transaction is a 1:1 historical snapshot — it captures what was agreed at deal time. Properties are never queried independently of their transaction, so a separate collection would add join complexity with no benefit. Embedding also makes the transaction document self-contained for audit purposes.

**3. commission_breakdowns as a separate collection.**
Immutability is clearer when the breakdown lives in its own document: there is no `update` path for it. The reports aggregation pipeline can join `commission_breakdowns` directly to `agents` without denormalising agent data into the transaction. A unique index on `transactionId` enforces the one-breakdown-per-transaction invariant at the database level.

**4. No WebSockets / real-time push.**
Dashboard data refreshes on user actions (navigation, button click). At the scale and scope of this system, polling on demand is sufficient. WebSockets would add operational complexity (stateful connections, Render free-tier restart behaviour) for no user-visible benefit.

**5. State machine as a pure function.**
Separating the transition rules from the persistence layer means the domain logic can be tested exhaustively without a database. The service calls `canTransition()` before any write; invalid transitions are rejected before Mongoose is touched.

**6. Commission engine as a pure function.**
Same rationale as the state machine. `compute()` takes fee and two agent IDs and returns a breakdown value object. There is no I/O. The function is called exactly once per transaction (at completion) and its output is immediately persisted as an immutable document.

**7. Money as integer minor units (kuruş).**
Floating-point representation of monetary values leads to rounding errors that compound across aggregations. Storing and computing in integer kuruş (1 TRY = 100 kuruş) eliminates this class of bugs entirely. The `common/money` module enforces this invariant; no other code performs monetary arithmetic directly.

**8. No monorepo tooling.**
`backend/` and `frontend/` are two independent npm projects. This matches the PDF requirement, keeps CI simple (each project has its own install and build step), and avoids the overhead of Turborepo or pnpm workspaces for a two-package repository.
