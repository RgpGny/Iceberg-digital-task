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
