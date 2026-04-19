# Iceberg Transactions — Design Spec

**Date:** 2026-04-19
**Status:** Approved (pre-implementation)
**Source:** `docs/technical-case.pdf` (Iceberg Digital technical case)
**Repo:** https://github.com/RgpGny/Iceberg-digital-task

---

## 1. Problem

An estate-agency consultancy needs to automate the post-agreement lifecycle of a property transaction (earnest money → title deed → completion) and auto-distribute the service fee between the agency and the involved agents, without manual spreadsheets or human error.

## 2. Scope

Full PDF coverage, no feature cuts. Authentication is deliberately out of scope (the PDF does not mention it); documented as a conscious YAGNI decision with extension hooks left in place. Single-tenant assumption.

### Functional requirements (from PDF)

1. Track transaction stage through `agreement → earnest_money → title_deed → completed`.
2. Trigger stage transitions from a frontend dashboard.
3. Prevent invalid transitions (optional per PDF — we implement it; documented in DESIGN.md).
4. Auto-compute and persist a commission breakdown on completion.
5. Expose REST APIs for all core operations.
6. Unit tests for commission rules, stage transitions, and core business logic.
7. Deliver DESIGN.md, README.md, live API URL, live frontend URL, MongoDB Atlas.

### Commission policy (PDF §4.3)

- Agency always receives 50 % of the service fee.
- Scenario 1 — listing agent = selling agent → that agent receives 100 % of the agent portion (50 %).
- Scenario 2 — listing agent ≠ selling agent → they split the agent portion equally (25 % each).

## 3. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Runtime | Node.js 20 LTS | Pinned via `.nvmrc` and `engines` |
| Language | TypeScript 5.x (strict mode) | |
| Backend framework | NestJS 10 | Mandatory |
| ORM | Mongoose 8 | Official, ergonomic over the raw driver |
| Database | MongoDB Atlas M0 (Shared, AWS eu-central-1) | Mandatory |
| Frontend framework | Nuxt 3 | Mandatory |
| State management | Pinia | Mandatory |
| UI | Tailwind CSS + Nuxt UI | Nuxt UI gives us production-quality primitives |
| Testing (backend) | Jest + `mongodb-memory-server` | Unit + integration |
| Testing (E2E) | Playwright | Dashboard flows |
| Validation | `class-validator` + `class-transformer` + Zod-style env validation | |
| API docs | `@nestjs/swagger` → `/api/docs` | |
| Deploy (backend) | Render.com Web Service (free) | Frankfurt region |
| Deploy (frontend) | Vercel | |
| Uptime | GitHub Actions cron | Pings `/health` every 10 min to mitigate Render cold start |

## 4. Repository Layout

```
Iceberg-digital-task/
├── backend/                       # NestJS app, standalone package.json
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── common/                # filters, interceptors, pipes, money utils
│   │   ├── config/                # env schema, mongoose config
│   │   ├── health/                # /health endpoint
│   │   └── modules/
│   │       ├── agents/            # AgentsModule
│   │       ├── transactions/      # TransactionsModule + state machine
│   │       └── commissions/       # CommissionsModule (rule engine)
│   ├── test/                      # e2e + integration
│   ├── package.json
│   └── tsconfig.json
├── frontend/                      # Nuxt 3 app, standalone package.json
│   ├── pages/
│   ├── components/
│   ├── stores/                    # Pinia
│   ├── composables/
│   ├── assets/
│   ├── nuxt.config.ts
│   ├── tailwind.config.ts
│   └── package.json
├── .specify/                      # SpecKit artifacts
├── .claude/
│   ├── agents/                    # nestjs-backend.md, nuxt-frontend.md
│   └── settings.json              # hooks, permissions
├── .github/workflows/             # ci.yml, deploy.yml, uptime-ping.yml
├── docs/
│   ├── technical-case.pdf         # source brief
│   └── superpowers/specs/         # design docs (this file)
├── DESIGN.md                      # PDF-required architectural writeup
├── README.md                      # PDF-required install & run guide
├── .nvmrc
└── .gitignore
```

No monorepo tooling (Turborepo, pnpm workspace). `backend/` and `frontend/` are independent npm projects — matches the PDF's literal phrasing and keeps reviewer onboarding zero-friction.

## 5. Data Model (hybrid: normalize what varies, embed what doesn't)

### `agents` collection

```ts
{
  _id: ObjectId,
  name: string,
  email: string,
  createdAt: Date,
  updatedAt: Date
}
```

Seeded with 4–5 agents via `npm run seed`. Referenced by `ObjectId` from transactions.

### `transactions` collection

```ts
{
  _id: ObjectId,
  property: {                      // embedded — 1:1 with transaction, needs history
    address: string,
    type: 'sale' | 'rental',
    listPrice: Money
  },
  serviceFee: Money,
  listingAgentId: ObjectId,        // ref → agents
  sellingAgentId: ObjectId,        // ref → agents
  stage: 'agreement' | 'earnest_money' | 'title_deed' | 'completed',
  stageHistory: [                  // embedded audit trail
    { from: Stage | null, to: Stage, at: Date, note?: string }
  ],
  createdAt: Date,
  updatedAt: Date,
  completedAt: Date | null
}
```

### `commission_breakdowns` collection

```ts
{
  _id: ObjectId,
  transactionId: ObjectId,         // 1:1 ref, unique index
  totalFee: Money,
  agencyShare: Money,              // always 50 %
  agentShares: [
    {
      agentId: ObjectId,
      role: 'listing' | 'selling' | 'dual',
      amount: Money,
      percentage: number,          // 25, 50, etc.
      rationale: string            // "listing & selling agent — full 50 % share"
    }
  ],
  scenario: 'same_agent' | 'different_agents',
  computedAt: Date
}
```

Immutable snapshot written once on stage → `completed`. Not recomputed. Gives a clean audit trail and cheap reporting queries (by agent, by date).

### `Money` value object

```ts
{ amount: number, currency: 'GBP' }
```

`amount` is an integer in **minor units** (pence) to avoid floating-point error. All arithmetic goes through a single `Money` helper.

### Rationale (mirrored into DESIGN.md)

- **Embed property** inside the transaction: 1:1, property data is a historical fact of the deal.
- **Reference agents**: they exist independently, get reused, and may be renamed.
- **Separate `commission_breakdowns` collection**: immutability, audit trail, direct reporting queries, clear separation between "what the deal is" and "what was paid".

## 6. Backend Architecture

### Module layout

```
src/
├── main.ts                        # Swagger, validation pipe, CORS
├── app.module.ts
├── common/
│   ├── money/                     # Money VO + arithmetic (pure, tested)
│   ├── filters/                   # AllExceptionsFilter
│   └── dto/
├── config/                        # Joi env schema
├── health/                        # /health — for Render uptime ping
└── modules/
    ├── agents/
    │   ├── agent.schema.ts
    │   ├── agents.service.ts
    │   ├── agents.controller.ts
    │   └── dto/
    ├── transactions/
    │   ├── transaction.schema.ts
    │   ├── transactions.service.ts
    │   ├── transactions.controller.ts
    │   ├── state-machine/         # pure function: canTransition(from, to)
    │   └── dto/
    └── commissions/
        ├── breakdown.schema.ts
        ├── commissions.service.ts
        ├── commissions.controller.ts
        └── engine/                # pure function: compute(fee, listingAgentId, sellingAgentId)
```

### State machine

Valid transitions only:

```
agreement → earnest_money → title_deed → completed
```

No skipping, no backward moves. Violations throw a `BusinessError` mapped to HTTP 400 with a machine-readable `code` and a human `message`. The state machine is a pure function tested in isolation.

### Commission engine

Pure function `compute(fee, listingAgentId, sellingAgentId)` returning a `CommissionBreakdown` shape. Tested independently of Mongoose. Called from `TransactionsService` when the target stage is `completed`, inside a single write path that:

1. Transitions the stage.
2. Computes the breakdown.
3. Persists the breakdown document.
4. Sets `transaction.completedAt`.

If the breakdown already exists (idempotency), we do not recompute.

### API surface

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness probe (Render + uptime ping) |
| `GET` | `/agents` | List |
| `POST` | `/agents` | Create |
| `GET` | `/transactions` | List + filter by stage |
| `POST` | `/transactions` | Create (stage defaults to `agreement`) |
| `GET` | `/transactions/:id` | Detail with `stageHistory` |
| `POST` | `/transactions/:id/transition` | Body `{ toStage, note? }` |
| `GET` | `/transactions/:id/breakdown` | Returns 404 until completed |
| `GET` | `/reports/earnings?agentId=&from=&to=` | Aggregates across breakdowns |
| `GET` | `/api/docs` | Swagger UI |

### Validation & errors

- DTOs via `class-validator`, global `ValidationPipe` with `whitelist` + `forbidNonWhitelisted`.
- Single `AllExceptionsFilter` returning `{ statusCode, code, message, details? }`.
- `BusinessError` vs `ValidationError` vs generic `InternalError` — reviewers see intent.

## 7. Frontend Architecture

### Pages

- `pages/index.vue` — dashboard: transaction list, stage filter, quick stats.
- `pages/transactions/new.vue` — create transaction form (property + agents + fee).
- `pages/transactions/[id].vue` — detail: stage timeline, transition buttons (only legal next stage enabled), commission breakdown card once completed.
- `pages/reports.vue` — earnings by agent / agency, date range filter.

### Components

- `StageTimeline.vue` — four stages, current one highlighted, history shown as tooltip.
- `TransitionButton.vue` — calls `POST /transactions/:id/transition`; disabled for illegal targets.
- `CommissionBreakdownCard.vue` — agency share + per-agent rows + rationale.
- `AgentPicker.vue` — typeahead for agent selection.

### State (Pinia)

- `stores/transactions.ts` — list + detail + actions (`create`, `transition`, `fetchOne`).
- `stores/agents.ts` — list cache.
- `stores/reports.ts` — derived aggregates.

### API layer

`composables/useApi.ts` wraps `$fetch` (Nuxt built-in, `ofetch` under the hood) with:

- Base URL from `NUXT_PUBLIC_API_URL`.
- Typed request/response generics.
- Central error mapping to toasts.

## 8. Testing Strategy

| Level | Tool | Targets |
|---|---|---|
| Unit | Jest | `Money` arithmetic, state machine (valid + every illegal pair), commission engine (both scenarios + edge cases: equal agents, zero fee guard, negative fee rejection) |
| Integration | Jest + `mongodb-memory-server` | `TransactionsService` full flow including commission write on completion |
| Contract | Supertest | Every endpoint — happy path + validation error + business error |
| E2E | Playwright | Dashboard → create transaction → transition through stages → see breakdown |

Backend business-logic coverage target: **≥ 85 %**. Commission engine and state machine: **100 %**.

## 9. Deployment

### MongoDB Atlas

- Cluster: M0 Free (Shared), AWS eu-central-1.
- Database user: app-scoped, `readWrite` on the `iceberg` database.
- Network: `0.0.0.0/0` allowlist (Render has rotating egress IPs on the free plan; documented tradeoff).
- Connection string in `MONGODB_URI` env var on Render + local `.env`.

### Render (backend)

- Web Service, root `backend/`.
- Build: `npm ci && npm run build`.
- Start: `node dist/main.js`.
- Auto-deploy from `main` branch.
- Env vars: `MONGODB_URI`, `NODE_ENV=production`, `CORS_ORIGIN=<vercel-url>`, `PORT=10000`.
- Health check path: `/health`.

### Vercel (frontend)

- Nuxt preset, root `frontend/`.
- Env var: `NUXT_PUBLIC_API_URL=<render-url>`.
- Auto-deploy from `main`.

### Uptime mitigation

`.github/workflows/uptime-ping.yml` — cron `*/10 * * * *` → `curl -fsS $RENDER_URL/health`. Keeps the free-tier web service warm during demo hours. Documented as a tradeoff, not a production practice.

## 10. SpecKit Workflow

Global install: `uv tool install specify-cli`. In-repo init: `specify init --here --ai claude`.

`.specify/memory/constitution.md` encodes project invariants:

1. Mandatory stack: NestJS 10 + MongoDB Atlas + Nuxt 3 + Pinia + Tailwind.
2. Test-first for commission engine and state machine (pure functions).
3. API-first: Swagger must stay in sync.
4. Money is always integer minor units.
5. DESIGN.md updated with every feature that changes architecture.

Feature flow: `/specify <feature>` → `/plan` → `/tasks` → `/implement`, with `/analyze` to catch drift.

## 11. AI-Native Tooling

### MCP servers

| Server | Status | Purpose |
|---|---|---|
| `github` | already installed | PR/issue/branch automation |
| `playwright` | already installed | E2E test authoring and runs |
| `vercel` | already installed | Frontend deploys, env sync |
| MongoDB MCP | to add | Query Atlas from inside Claude during dev |
| Render MCP | to add | Deploys, logs, env for the backend |

Credentials for the added servers land in `.claude/settings.local.json` (gitignored). Never committed.

### Skills (already installed, actively used)

- `superpowers:brainstorming` → `writing-plans` → `executing-plans`
- `superpowers:test-driven-development` (mandatory — PDF requires tests)
- `superpowers:systematic-debugging`
- `superpowers:verification-before-completion`
- `vercel:deploy`, `vercel:env`
- `frontend-design:frontend-design` (Nuxt UI polish)
- `pr-review-toolkit:review-pr` (pre-merge gate)

### Custom sub-agents (project-scoped, in `.claude/agents/`)

- `nestjs-backend.md` — owns `backend/**`; writes NestJS modules, services, DTOs, Jest tests. Aware of our module layout, state machine, and commission engine conventions.
- `nuxt-frontend.md` — owns `frontend/**`; writes Nuxt pages, Pinia stores, Tailwind components.

**Do not use** the built-in `backend-agent` and `db-agent` — they target Next.js + Supabase and would produce wrong patterns.

### Hooks (`.claude/settings.json`)

- `PostToolUse` on `Edit` for `backend/**/*.ts` → `eslint --fix` + `prettier --write`.
- `PostToolUse` on `Edit` for `frontend/**/*.{vue,ts}` → `eslint --fix` + `prettier --write`.
- `PostToolUse` on `Edit` for `**/*.spec.ts` → run Jest on that file.
- `Stop` hook → backend typecheck + full test suite as a pre-handover gate.

## 12. CI/CD

`.github/workflows/ci.yml` on PR:

- Parallel jobs: `backend-lint-test`, `frontend-lint-test`.
- Each: `npm ci` → `lint` → `typecheck` → `test`.
- Upload Jest coverage as artifact.

`main` branch protected: PR required, CI green required.

Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`). Keeps history readable and unlocks automated changelog later if wanted.

## 13. Delivery Checklist (PDF ↔ plan)

| PDF requirement | Plan coverage |
|---|---|
| 6.1 Public Git repo, backend/frontend folders | `github.com/RgpGny/Iceberg-digital-task`, two top-level folders |
| 6.2 Unit tests (commission, stages, core) | Jest suites per §8 |
| 6.3 DESIGN.md | Authored alongside implementation, sourced from this spec |
| 6.4 README.md | Authored with install + run + live URLs |
| 6.5 Live API URL, Live Frontend URL, Atlas | Render + Vercel + Atlas M0 |
| §4.1 Stages + transitions | State machine + dashboard transitions |
| §4.1 Optional invalid-transition guard | Implemented; justified in DESIGN.md |
| §4.2 Financial breakdown (who earned what + why) | `commission_breakdowns` with `rationale` per share |
| §4.3 Commission policy (50/50, dual-role rule) | Pure function in `engine/`, unit-tested both scenarios |

## 14. Deliberate Non-Goals (YAGNI)

- **Authentication / multi-tenancy** — not in PDF; single-tenant assumed. Extension point: `AuthModule` shell left out; route guards are trivial to bolt on.
- **Real-time updates (WebSocket)** — not in PDF; dashboard refreshes on transition actions are enough.
- **Property as a separate collection** — property is a 1:1 artifact of a transaction; embedding wins.
- **Monorepo tooling** — two independent packages; no shared code to justify Turborepo or pnpm workspace.
- **Custom domain** — `*.vercel.app` and `*.onrender.com` are sufficient for the live URLs.

## 15. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Render cold start (~30–50 s first request) | GitHub Actions cron ping every 10 min; documented in README |
| Atlas M0 512 MB limit | Only 3 collections, small documents; far under cap |
| Floating-point rounding in commission math | Integer minor units through a `Money` helper; tested |
| Breakdown drift if rules change post-completion | Immutable snapshot; rules changes don't retro-edit closed deals |
| Mongoose schema drift vs DTOs | DTOs are the API contract; Mongoose models live behind services |

---

## Approval

Design approved by user on 2026-04-19. Next step: generate the implementation plan via the `superpowers:writing-plans` skill.
