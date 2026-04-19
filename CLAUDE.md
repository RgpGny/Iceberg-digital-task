# CLAUDE.md — Iceberg Transactions

Operating instructions for Claude Code when working in this repository. Read this before touching any file.

---

## 1. Project in one paragraph

Iceberg Transactions automates the post-agreement lifecycle of an estate-agency property deal (agreement → earnest money → title deed → completed) and auto-distributes the service fee between the agency and the involved agents. The backend is NestJS + MongoDB Atlas, the frontend is Nuxt 3 + Pinia + Tailwind, deployed on Render + Vercel. Full architectural context lives in `docs/superpowers/specs/2026-04-19-iceberg-transactions-design.md` and, once implementation starts, in `DESIGN.md`. The source brief is `docs/technical-case.pdf`.

## 2. Mandatory stack (non-negotiable)

- Node.js 20 LTS — pinned via `.nvmrc` and `engines`
- TypeScript (strict mode)
- **Backend:** NestJS 10, Mongoose 8, MongoDB Atlas, Jest
- **Frontend:** Nuxt 3, Pinia, Tailwind CSS
- **Testing:** Jest + `mongodb-memory-server` for backend, Playwright for E2E

Do not swap any of these. The PDF requires them and the evaluator grades stack compliance.

## 3. Repository layout

```
backend/     NestJS app, independent package.json
frontend/    Nuxt 3 app, independent package.json
docs/        Design docs, brief, spec history
.specify/    SpecKit artifacts (constitution, specs, plans, tasks)
.claude/     Agents, hooks, local settings
.github/     CI + deploy + uptime workflows
DESIGN.md    PDF-required architectural writeup
README.md    PDF-required install/run guide + live URLs
```

`backend/` and `frontend/` are independent npm projects. **No monorepo tooling** (no Turborepo, no pnpm workspace) — two folders with their own `package.json` as the PDF requires.

## 4. Invariants — never break these

1. **Money is always integer minor units** (pence). Every monetary value passes through `backend/src/common/money/`. No floating-point `amount`. Never.
2. **Commission breakdowns are immutable.** Once a transaction is `completed` and the breakdown is written, do not edit or recompute it. Rule changes do not retro-edit closed deals.
3. **State machine is pure and total.** `agreement → earnest_money → title_deed → completed`. No skipping, no backward moves. Invalid transitions throw `BusinessError`. The function is tested in isolation; do not inline stage logic inside controllers or services.
4. **DTOs are the API contract.** Mongoose schemas live behind services. Controllers return DTOs. Never leak a raw Mongoose document across a module boundary.
5. **Secrets never enter git.** `.env` and `.claude/settings.local.json` are gitignored. If you see a secret in a file that is about to be staged, stop and move it.
6. **Conventional Commits.** `feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`. One concern per commit.

## 5. Commands you should know

From each package root:

```bash
# backend/
npm install
npm run start:dev       # local dev
npm run build
npm run start:prod
npm run test            # Jest unit
npm run test:e2e        # integration / contract
npm run test:cov
npm run lint
npm run format

# frontend/
npm install
npm run dev             # Nuxt dev server
npm run build
npm run preview
npm run test            # Vitest or Jest depending on setup
npm run lint
```

Full list will land in the respective `package.json`s and README.md during implementation.

## 6. Workflow discipline

### SpecKit-driven development

Every non-trivial feature goes through (commands are namespaced under `/speckit-` because SpecKit 0.7.4+ installs them that way):

1. `/speckit-specify <feature description>` — produces a feature spec under `.specify/specs/`
2. `/speckit-plan` — generates an implementation plan against the constitution
3. `/speckit-tasks` — breaks the plan into reviewable tasks
4. `/speckit-implement` — executes the tasks

Do not skip straight to code on architectural changes. Small fixes (typos, lint, copy) can bypass SpecKit.

### Test-first for pure functions

Commission engine and state machine are **pure functions** and must be written test-first. Write the Jest spec, run it red, implement, run it green. `superpowers:test-driven-development` is the reference skill.

### Verification before "done"

Before claiming any task is complete, run the relevant command and confirm output:

- Changed backend code → `npm run lint && npm run test` in `backend/`.
- Changed frontend code → `npm run lint && npm run build` in `frontend/`.
- Changed deploy config → verify the deploy preview.

Never assert success from "the diff looks right." Use `superpowers:verification-before-completion`.

## 7. Sub-agents

Project-scoped sub-agents live in `.claude/agents/`:

- **`nestjs-backend`** — owns `backend/**`. Writes NestJS modules, services, DTOs, Jest tests. Knows the state machine and commission engine conventions.
- **`nuxt-frontend`** — owns `frontend/**`. Writes Nuxt pages, Pinia stores, Tailwind components.

**Do not use the built-in `backend-agent` or `db-agent`.** They target Next.js + Supabase and will produce wrong patterns for this repo.

Generic agents that are fine to use: `Explore`, `Plan`, `general-purpose`, `integration-agent`, `test-agent`, `pr-review-toolkit:code-reviewer`, `pr-review-toolkit:silent-failure-hunter`.

## 8. MCP servers in use

- `github` — PR/issue/branch automation
- `playwright` — E2E authoring and runs
- `vercel` — frontend deploys
- `supabase` — **not used** (we are on MongoDB Atlas)
- MongoDB MCP — inspect Atlas data during dev
- Render MCP — backend deploys, logs, env

Credentials for MongoDB / Render MCPs live in `.claude/settings.local.json` (gitignored).

## 9. Hooks (automated per `.claude/settings.json`)

- Edit on `backend/**/*.ts` → `eslint --fix` + `prettier --write`
- Edit on `frontend/**/*.{vue,ts}` → `eslint --fix` + `prettier --write`
- Edit on `**/*.spec.ts` → run Jest on that file
- Session `Stop` → backend typecheck + full test suite

If a hook fails, fix the underlying issue. Do not bypass hooks with `--no-verify`.

## 10. Deploy topology

- **Frontend:** Vercel, Nuxt preset, auto-deploy from `main`, env `NUXT_PUBLIC_API_URL`.
- **Backend:** Render web service (free, Frankfurt), auto-deploy from `main`, env `MONGODB_URI`, `CORS_ORIGIN`, `NODE_ENV`, `PORT`.
- **Database:** MongoDB Atlas M0, AWS eu-central-1, network allowlist `0.0.0.0/0`.
- **Uptime:** GitHub Actions cron pings `/health` every 10 min to mitigate Render cold starts.

Live URLs (to be filled in after first deploy) go in `README.md`.

## 11. What we explicitly do NOT do

- **No authentication.** PDF does not require it. Single-tenant assumed. `AuthModule` extension point left open, nothing more.
- **No WebSockets / real-time.** Dashboard refreshes on actions are enough.
- **No Property as a separate collection.** It is embedded in the transaction (1:1, historical).
- **No Turborepo or pnpm workspace.** Two independent npm projects.
- **No custom domain.** `*.vercel.app` + `*.onrender.com` suffice.
- **No recomputing commission breakdowns.** Immutable snapshot on completion.

## 12. When something isn't in this file

1. Check `docs/superpowers/specs/2026-04-19-iceberg-transactions-design.md` — the full design.
2. Check `DESIGN.md` — implementation-level architectural decisions (once written).
3. Check `docs/technical-case.pdf` — the source brief.
4. If still unsure, stop and ask the user. Do not improvise on architectural questions.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->
