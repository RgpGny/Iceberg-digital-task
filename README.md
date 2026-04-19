# Iceberg Transactions

Estate-agency transaction lifecycle + automatic commission distribution.

- **Backend:** NestJS 10 + MongoDB Atlas (Mongoose)
- **Frontend:** Nuxt 3 + Pinia + Nuxt UI / Tailwind
- **Deploy:** Render (backend) · Vercel (frontend) · MongoDB Atlas M0

## Live URLs

- API: _to be filled in after first deploy_
- Frontend: _to be filled in after first deploy_
- Swagger: _<API URL>/api/docs_

## Local development

Requires Node 20 LTS (`nvm use`) and MongoDB Atlas credentials.

### Backend

```bash
cd backend
cp .env.example .env  # fill in MONGODB_URI etc.
npm install
npm run start:dev     # http://localhost:3000
```

### Frontend

```bash
cd frontend
cp .env.example .env  # NUXT_PUBLIC_API_URL=http://localhost:3000
npm install --legacy-peer-deps
npm run dev           # http://localhost:3001
```

### Tests

```bash
(cd backend && npm run test)
(cd backend && npm run test:e2e)
(cd frontend && npm run lint)
```

## Repository layout

See `CLAUDE.md` at the repo root.

## Project history

- Design spec: `docs/superpowers/specs/2026-04-19-iceberg-transactions-design.md`
- Plans: `docs/superpowers/plans/`
