# Iceberg Transactions Constitution

## Core Principles

### I. Mandatory Stack
Backend MUST use NestJS 10 with MongoDB Atlas via Mongoose 8. Frontend MUST use Nuxt 3 with Pinia and Tailwind CSS. Runtime is Node.js 20 LTS. These are non-negotiable (PDF technical-case requirement).

### II. Test-First for Pure Logic (NON-NEGOTIABLE)
The state machine (`canTransition`) and commission engine (`compute`) MUST be written test-first with Jest. Red → green → refactor. These two functions MUST reach 100% coverage. Other backend business logic MUST reach ≥85%.

### III. API-First
Every backend endpoint MUST be documented via `@nestjs/swagger` and exposed at `/api/docs`. DTOs are the API contract. Mongoose schemas MUST NOT leak across module boundaries.

### IV. Money Is Always Integer Minor Units
All monetary values use `{ amount: integer, currency: 'TRY' }` where `amount` is in kuruş. Never floating-point. All arithmetic goes through `backend/src/common/money/`.

### V. Commission Breakdowns Are Immutable
Once a transaction is completed and the breakdown is written, it MUST NOT be edited or recomputed. Rule changes never retro-edit closed deals.

### VI. Conventional Commits
Commit subjects start with `feat:`, `fix:`, `test:`, `docs:`, `chore:`, or `refactor:`. One concern per commit.

### VII. Secrets Never Enter Git
`.env*` and `.claude/settings.local.json` are gitignored. Any commit containing a credential must be amended before push.

## Stack Constraints

- Node.js 20 LTS
- TypeScript strict mode
- Backend: NestJS 10, Mongoose 8, Jest, `class-validator`
- Frontend: Nuxt 3, Pinia, Nuxt UI (bundles Tailwind), Vitest
- E2E: Playwright
- Deploy: Render (backend), Vercel (frontend), MongoDB Atlas M0

## Development Workflow

- Features go through `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`.
- Small fixes (typos, lint, copy) may bypass SpecKit.
- Every PR must pass CI (lint + typecheck + test) before merge.
- `main` is protected.

## Governance

This constitution supersedes ad-hoc decisions. Amendments require documenting the change in this file and updating CLAUDE.md if it affects agent behavior.

**Version**: 1.0.0 | **Ratified**: 2026-04-19 | **Last Amended**: 2026-04-19
