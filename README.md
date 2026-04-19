# Iceberg Transactions

Estate-agency transaction lifecycle + automatic commission distribution.

- **Backend:** NestJS 10 + MongoDB Atlas (Mongoose 8)
- **Frontend:** Nuxt 3 + Pinia + Nuxt UI / Tailwind
- **Deploy:** Render (backend) · Vercel (frontend) · MongoDB Atlas M0

## Live URLs

- **API:** https://iceberg-api-8s7s.onrender.com
- **Frontend:** https://ragipgunay-icebergdigital-task.vercel.app
- **Swagger:** https://iceberg-api-8s7s.onrender.com/api/docs

## Architecture

Full architectural documentation lives in [`DESIGN.md`](./DESIGN.md). Key sections:

- Data model (agents, transactions, commission_breakdowns, Money VO)
- State machine (agreement → earnest_money → title_deed → completed)
- Commission engine (50/50 agency split, same-agent vs different-agents scenarios)
- API surface (all endpoints)
- Deployment topology

## Local Development

Requires **Node 20 LTS** — use `nvm use` at the repo root (`.nvmrc` is present).

### 1. Backend

```bash
cd backend
cp .env.example .env        # fill in MONGODB_URI, CORS_ORIGIN, PORT
npm install
npm run start:dev           # http://localhost:3000
# Swagger UI available at http://localhost:3000/api/docs
```

Required environment variables (validated at startup via Joi):

| Variable | Example |
|---|---|
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/iceberg` |
| `CORS_ORIGIN` | `http://localhost:3001` |
| `NODE_ENV` | `development` |
| `PORT` | `3000` |

### 2. Frontend

```bash
cd frontend
cp .env.example .env        # NUXT_PUBLIC_API_URL=http://localhost:3000
npm install --legacy-peer-deps
npm run dev                 # http://localhost:3001
```

Required environment variables:

| Variable | Example |
|---|---|
| `NUXT_PUBLIC_API_URL` | `http://localhost:3000` |

## Running Tests

### Backend

```bash
# Unit + integration tests
cd backend && npm run test

# With coverage report
cd backend && npm run test:cov

# End-to-end (Supertest against mongodb-memory-server)
cd backend && npm run test:e2e

# Lint
cd backend && npm run lint
```

Test coverage targets: `common/money`, state machine, and commission engine must all be at **100 %** (pure functions, tested in isolation).

### Frontend

```bash
# Lint + type-check
cd frontend && npm run lint

# Production build (also validates types)
cd frontend && npm run build

# Preview production build locally
cd frontend && npm run preview
```

## Repository Layout

```
backend/     NestJS app — independent package.json
frontend/    Nuxt 3 app — independent package.json
docs/        Design docs, source brief (technical-case.pdf), spec history
.specify/    SpecKit artifacts (constitution, specs, plans, tasks)
.claude/     Sub-agents, hooks, local settings (gitignored secrets)
.github/     CI, deploy, and uptime workflows
DESIGN.md    Full architectural writeup
CLAUDE.md    Operating instructions for Claude Code
README.md    This file
```

`backend/` and `frontend/` are independent npm projects — no monorepo tooling (no Turborepo, no pnpm workspaces).

## Project History

- Source brief: `docs/technical-case.pdf`
- Approved design spec: `docs/superpowers/specs/2026-04-19-iceberg-transactions-design.md`
- Implementation plans: `docs/superpowers/plans/`
