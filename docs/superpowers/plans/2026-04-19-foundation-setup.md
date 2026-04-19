# Foundation & Scaffolding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current repo (spec + CLAUDE.md + gitignore) into a fully configured empty project where both `backend/` (NestJS) and `frontend/` (Nuxt 3) build, lint, and pass smoke tests, with SpecKit initialized, Claude Code hooks + custom subagents wired, CI green on `main`, and all secrets safely in gitignored local files.

**Architecture:** Two independent npm projects inside one repository, orchestrated by SpecKit for spec-driven features, guarded by ESLint/Prettier/Jest on the backend and ESLint/Prettier/Vitest on the frontend. MongoDB Atlas + Render + Vercel credentials never leave `.env` and `.claude/settings.local.json` (both gitignored). Sub-agents and hooks are project-scoped under `.claude/`.

**Tech Stack:** Node 20 LTS, TypeScript 5, NestJS 10, Mongoose 8, Nuxt 3, Nuxt UI (bundles Tailwind), Pinia, Jest, Vitest, Playwright (installed only; tests come in later plans), SpecKit via `uv tool install specify-cli`.

---

## File Structure After This Plan

```
/
├── .claude/
│   ├── agents/
│   │   ├── nestjs-backend.md
│   │   └── nuxt-frontend.md
│   ├── settings.json            # committed: hooks + permissions
│   └── settings.local.json      # gitignored: MCP secrets (mongodb + render)
├── .github/workflows/
│   └── ci.yml                   # lint + typecheck + test on PR
├── .specify/                    # created by `specify init`
│   └── memory/constitution.md   # project invariants
├── .nvmrc                       # "20"
├── .gitignore                   # already present, will extend
├── CLAUDE.md                    # already present
├── DESIGN.md                    # stub, expanded in Plan 4
├── README.md                    # stub, expanded in Plan 4
├── backend/
│   ├── .env.example
│   ├── .eslintrc.js
│   ├── .prettierrc
│   ├── nest-cli.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   ├── jest.config.ts           # custom, not nest default
│   ├── src/
│   │   ├── main.ts              # Nest scaffold, edited for port + CORS
│   │   └── app.module.ts        # empty module for now
│   └── test/
│       └── app.e2e-spec.ts      # Nest scaffold
├── frontend/
│   ├── .env.example
│   ├── .eslintrc.cjs
│   ├── .prettierrc
│   ├── nuxt.config.ts           # Nuxt UI + Pinia modules registered
│   ├── package.json
│   ├── tsconfig.json
│   ├── app.vue                  # Nuxt scaffold, trimmed to NuxtPage
│   └── pages/
│       └── index.vue            # placeholder landing page
└── docs/                        # already present
```

---

## Task 1: Environment & SpecKit Global Install

**Files:**
- Create: `.nvmrc`

- [ ] **Step 1: Verify Node 20 is available via nvm**

Run: `nvm ls 2>&1 | head -20` (your local has Node 25 installed globally; we still want a pinned Node 20 for dev parity with Render + Vercel).

If Node 20 is not listed:

Run: `nvm install 20 && nvm alias default 20`
Expected: Installation completes, `node -v` prints `v20.x.x`.

- [ ] **Step 2: Write `.nvmrc`**

Create `.nvmrc` with content:

```
20
```

- [ ] **Step 3: Activate Node 20 for this project**

Run: `nvm use`
Expected: `Now using node v20.x.x (npm v10.x.x)`.

- [ ] **Step 4: Install SpecKit globally via uv**

Run: `uv tool install specify-cli`
Expected: Tool installed, `specify --help` works.

If `specify` is not on PATH after install:

Run: `uv tool update-shell` and open a new terminal.

- [ ] **Step 5: Initialize SpecKit in the current repo**

Run: `specify init --here --ai claude --ignore-agent-tools`
Expected: Creates `.specify/` directory with `memory/constitution.md`, templates, and scripts. Also creates `.claude/skills/speckit-*/` with Claude Code slash commands (`/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement`, `/speckit-analyze`, `/speckit-constitution`, plus a few others) and appends a SPECKIT anchor block to `CLAUDE.md`.

- [ ] **Step 6: Verify SpecKit directory**

Run: `ls -la .specify/`
Expected: directories `memory/`, `templates/`, `scripts/`.

- [ ] **Step 7: Commit**

```bash
git add .nvmrc .specify/
git commit -m "chore: pin Node 20 and initialize SpecKit"
git push
```

---

## Task 2: Write the Project Constitution

**Files:**
- Modify: `.specify/memory/constitution.md` (overwrite placeholder)

- [ ] **Step 1: Overwrite constitution with our invariants**

Replace the entire file content with:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add .specify/memory/constitution.md
git commit -m "docs: author project constitution for SpecKit"
git push
```

---

## Task 3: Backend Scaffold via NestJS CLI

**Files:**
- Create: `backend/` (all NestJS default files)

- [ ] **Step 1: Scaffold NestJS into `backend/`**

Run: `npx -y @nestjs/cli@10 new backend --package-manager npm --strict`
Expected: New NestJS app created under `backend/`, dependencies installed. When prompted for package manager, answer `npm` (the flag should skip the prompt).

- [ ] **Step 2: Verify backend boots and tests run**

```bash
cd backend
npm run build
npm run test
cd ..
```
Expected: Build produces `dist/`, default `AppController` test passes.

- [ ] **Step 3: Remove Nest-generated git init**

NestJS CLI may initialize its own git repo inside `backend/`. Remove it so our root repo owns the history:

Run: `rm -rf backend/.git`
Expected: No error; `git status` from root now shows `backend/` as untracked.

- [ ] **Step 4: Commit**

```bash
git add backend/
git commit -m "feat(backend): scaffold NestJS 10 application"
git push
```

---

## Task 4: Backend — Mongoose, Config, and Env Validation

**Files:**
- Create: `backend/.env.example`
- Modify: `backend/src/app.module.ts`
- Create: `backend/src/config/env.validation.ts`
- Modify: `backend/package.json` (add deps)

- [ ] **Step 1: Install runtime dependencies**

```bash
cd backend
npm install @nestjs/config @nestjs/mongoose mongoose joi
cd ..
```

- [ ] **Step 2: Write `backend/.env.example`**

```
# MongoDB Atlas connection string (never commit real values)
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/iceberg?retryWrites=true&w=majority

# Server
NODE_ENV=development
PORT=3000

# CORS — Vercel frontend URL (set to https://*.vercel.app in prod)
CORS_ORIGIN=http://localhost:3001
```

- [ ] **Step 3: Write `backend/src/config/env.validation.ts`**

```ts
import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),
  MONGODB_URI: Joi.string().uri({ scheme: ['mongodb', 'mongodb+srv'] }).required(),
  CORS_ORIGIN: Joi.string().required(),
});

export interface EnvConfig {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  MONGODB_URI: string;
  CORS_ORIGIN: string;
}
```

- [ ] **Step 4: Update `backend/src/app.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envValidationSchema } from './config/env.validation';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] **Step 5: Run build to confirm typecheck passes**

```bash
cd backend
npm run build
cd ..
```
Expected: `dist/` produced, no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/.env.example backend/src/
git commit -m "feat(backend): wire Mongoose, config module, and env validation"
git push
```

---

## Task 5: Backend — CORS, Port, and Global Validation Pipe

**Files:**
- Modify: `backend/src/main.ts`

- [ ] **Step 1: Install `class-validator` + `class-transformer`**

```bash
cd backend
npm install class-validator class-transformer
cd ..
```

- [ ] **Step 2: Rewrite `backend/src/main.ts`**

```ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
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

  const port = config.getOrThrow<number>('PORT');
  await app.listen(port);
}

void bootstrap();
```

- [ ] **Step 3: Smoke test the app**

Create a local `.env` in `backend/` (gitignored) with placeholder values:

```
MONGODB_URI=mongodb://localhost:27017/iceberg-smoke
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:3001
```

Run: `cd backend && npm run start`
Expected: Server fails fast with a Mongoose connection error (no local Mongo running). If it instead starts listening, you have local Mongo — fine. We just want to confirm env validation passes and the app boots far enough to hit the DB layer. Kill the process with Ctrl+C.

Remove the smoke `.env` after:

Run: `rm backend/.env`

- [ ] **Step 4: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/main.ts
git commit -m "feat(backend): enable CORS and global ValidationPipe"
git push
```

---

## Task 6: Backend — Swagger on `/api/docs`

**Files:**
- Modify: `backend/src/main.ts`

- [ ] **Step 1: Install Swagger module**

```bash
cd backend
npm install @nestjs/swagger
cd ..
```

- [ ] **Step 2: Add Swagger setup to `backend/src/main.ts`**

Replace the file with:

```ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

- [ ] **Step 3: Build to confirm typecheck passes**

```bash
cd backend
npm run build
cd ..
```
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/main.ts
git commit -m "feat(backend): add Swagger UI at /api/docs"
git push
```

---

## Task 7: Backend — Prettier Config and Lint Script Parity

**Files:**
- Modify: `backend/package.json` (ensure scripts are consistent with hooks)
- Modify: `backend/.prettierrc`

- [ ] **Step 1: Inspect existing `backend/.prettierrc`**

Run: `cat backend/.prettierrc`
Expected: Likely `{ "singleQuote": true, "trailingComma": "all" }` (NestJS CLI default).

- [ ] **Step 2: Normalize `backend/.prettierrc`**

Overwrite with:

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "semi": true,
  "arrowParens": "always"
}
```

- [ ] **Step 3: Confirm lint + format scripts exist in `backend/package.json`**

Run: `grep -E '"(lint|format)"' backend/package.json`
Expected: Both scripts present (NestJS CLI generates them). If missing, add under `"scripts"`:

```json
"lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
"format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\""
```

- [ ] **Step 4: Run lint + format to verify**

```bash
cd backend
npm run lint
npm run format
cd ..
```
Expected: No errors. Files may be reformatted.

- [ ] **Step 5: Commit**

```bash
git add backend/.prettierrc backend/package.json backend/src backend/test
git commit -m "chore(backend): normalize Prettier config and verify lint scripts"
git push
```

---

## Task 8: Frontend Scaffold via Nuxt CLI

**Files:**
- Create: `frontend/` (all Nuxt default files)

- [ ] **Step 1: Scaffold Nuxt 3 into `frontend/`**

Run: `npx -y nuxi@latest init frontend --packageManager npm --gitInit false --no-install`
Expected: `frontend/` created with default Nuxt 3 app skeleton. No git init, no install yet.

- [ ] **Step 2: Install Nuxt dependencies**

```bash
cd frontend
npm install
cd ..
```
Expected: `node_modules/` populated, `package-lock.json` generated.

- [ ] **Step 3: Verify dev server starts**

```bash
cd frontend
npm run dev &
DEV_PID=$!
sleep 15
curl -fsS http://localhost:3000 >/dev/null && echo "UP"
kill $DEV_PID
cd ..
```
Expected: `UP` printed.

- [ ] **Step 4: Update Nuxt default port to 3001 to avoid backend clash**

Overwrite `frontend/nuxt.config.ts`:

```ts
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  modules: [],
  devServer: {
    port: 3001,
  },
  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL ?? 'http://localhost:3000',
    },
  },
});
```

- [ ] **Step 5: Write `frontend/.env.example`**

```
NUXT_PUBLIC_API_URL=http://localhost:3000
```

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): scaffold Nuxt 3 application on port 3001"
git push
```

---

## Task 9: Frontend — Nuxt UI (bundles Tailwind) and Pinia

**Files:**
- Modify: `frontend/nuxt.config.ts`
- Modify: `frontend/package.json` (deps)
- Modify: `frontend/app.vue`
- Create: `frontend/pages/index.vue`

- [ ] **Step 1: Install Nuxt UI and Pinia modules**

```bash
cd frontend
npx -y nuxi@latest module add ui
npx -y nuxi@latest module add @pinia/nuxt
cd ..
```
Expected: Both modules installed, `nuxt.config.ts` auto-updated to include them under `modules`.

- [ ] **Step 2: Verify `frontend/nuxt.config.ts` lists both modules**

Run: `cat frontend/nuxt.config.ts`
Expected: `modules: ['@nuxt/ui', '@pinia/nuxt']` (order may vary).

- [ ] **Step 3: Rewrite `frontend/app.vue`**

```vue
<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>
```

- [ ] **Step 4: Create `frontend/pages/index.vue`**

```vue
<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <h1 class="text-3xl font-semibold">Iceberg Transactions</h1>
      <p class="text-sm text-gray-500 mt-2">Foundation scaffold online.</p>
    </div>
  </div>
</template>
```

- [ ] **Step 5: Verify dev server renders the page**

```bash
cd frontend
npm run dev &
DEV_PID=$!
sleep 20
curl -fsS http://localhost:3001 | grep -q "Iceberg Transactions" && echo "OK"
kill $DEV_PID
cd ..
```
Expected: `OK` printed.

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): add Nuxt UI and Pinia, render landing page"
git push
```

---

## Task 10: Frontend — ESLint + Prettier

**Files:**
- Create: `frontend/.prettierrc`
- Create: `frontend/eslint.config.mjs`
- Modify: `frontend/package.json` (scripts + deps)

- [ ] **Step 1: Install @nuxt/eslint and prettier**

```bash
cd frontend
npx -y nuxi@latest module add eslint
npm install --save-dev prettier eslint-plugin-prettier
cd ..
```

- [ ] **Step 2: Write `frontend/.prettierrc`**

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "semi": true,
  "arrowParens": "always"
}
```

- [ ] **Step 3: Ensure `frontend/eslint.config.mjs` exists**

The `@nuxt/eslint` module generates this file. Verify:

Run: `cat frontend/eslint.config.mjs`
Expected: A module-style eslint config importing `withNuxt` (Nuxt 3.15+ preset). If missing, `npx nuxi module add eslint` regenerates it.

- [ ] **Step 4: Add lint + format scripts to `frontend/package.json`**

Inside `"scripts"`, add (or merge with existing):

```json
"lint": "eslint .",
"lint:fix": "eslint . --fix",
"format": "prettier --write \"**/*.{ts,vue,css,json,md}\""
```

- [ ] **Step 5: Run lint + format**

```bash
cd frontend
npm run lint:fix
npm run format
cd ..
```
Expected: No errors; files may be reformatted.

- [ ] **Step 6: Commit**

```bash
git add frontend/
git commit -m "chore(frontend): add ESLint (Nuxt preset) and Prettier"
git push
```

---

## Task 11: Root-Level `.env.example` and `.env` Hygiene

**Files:**
- Create: `.env.example` (root-level, links to sub-projects)

- [ ] **Step 1: Write root `.env.example`**

```
# This file is documentation only.
# Each sub-project has its own .env:
#   backend/.env    (see backend/.env.example)
#   frontend/.env   (see frontend/.env.example)
#
# The root project itself has no runtime env variables.
```

- [ ] **Step 2: Verify `.gitignore` excludes `.env`**

Run: `grep -E '^\.env' .gitignore`
Expected: Lines matching `.env`, `.env.*`, and explicit `!.env.example` exceptions (already present from earlier commit).

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "docs: add root-level env documentation stub"
git push
```

---

## Task 12: Claude Code — Custom Sub-Agents

**Files:**
- Create: `.claude/agents/nestjs-backend.md`
- Create: `.claude/agents/nuxt-frontend.md`

- [ ] **Step 1: Write `.claude/agents/nestjs-backend.md`**

```markdown
---
name: nestjs-backend
description: Use for backend work in this repo — NestJS modules, services, controllers, DTOs, Mongoose schemas, state machine, commission engine, Jest tests. Owns `backend/**`. Never writes frontend code, migrations for other databases, or deploy YAML.
tools: Bash, Read, Write, Edit, Glob, Grep
---

You write production NestJS 10 + Mongoose 8 code for the Iceberg Transactions backend.

## Invariants (read CLAUDE.md at repo root for the full list)

- TypeScript strict mode. No `any`.
- Money is integer minor units. All arithmetic goes through `backend/src/common/money/`.
- State machine (`canTransition`) and commission engine (`compute`) are **pure functions** with **100% test coverage**, written **test-first**.
- DTOs are the API contract. Never return raw Mongoose documents from controllers.
- Every endpoint is Swagger-annotated (`@ApiOperation`, `@ApiResponse`).
- Commission breakdowns are written once and never edited.

## Style

- One module per domain concept under `backend/src/modules/`.
- Service methods return plain objects (DTOs). Controllers bind HTTP concerns only.
- Validation via `class-validator` in DTOs + global `ValidationPipe`.
- Errors: throw `BusinessError` / `NotFoundException` / `BadRequestException`. Never return error payloads manually.

## Testing

- Jest is the only test runner. Unit tests co-located as `*.spec.ts`. Integration/E2E under `backend/test/`.
- Use `mongodb-memory-server` for integration tests, not mocks of Mongoose.
- Red → green → refactor. Write the failing test first.

## What you don't do

- No `console.log`. Use Nest's Logger.
- No feature flags or backwards-compat shims.
- No touching frontend code.
- No adding packages without noting why in the commit message.
```

- [ ] **Step 2: Write `.claude/agents/nuxt-frontend.md`**

```markdown
---
name: nuxt-frontend
description: Use for frontend work in this repo — Nuxt 3 pages, layouts, components, Pinia stores, composables, Tailwind/Nuxt UI styling. Owns `frontend/**`. Never writes backend code, NestJS modules, or database schemas.
tools: Bash, Read, Write, Edit, Glob, Grep
---

You write production Nuxt 3 + Pinia + Nuxt UI code for the Iceberg Transactions dashboard.

## Invariants (read CLAUDE.md at repo root for the full list)

- TypeScript strict mode. No `any`.
- API calls go through the `useApi` composable. Never call `$fetch` directly from components.
- Shared state lives in Pinia stores under `frontend/stores/`. Components read via the store, not ad-hoc refs.
- Styling: Nuxt UI primitives first, Tailwind utility classes second. No custom CSS files unless unavoidable.
- Accessibility: semantic HTML, labeled inputs, keyboard navigation, visible focus.

## Style

- One page per route under `frontend/pages/`.
- Components under `frontend/components/` are auto-imported — name them by role (`StageTimeline.vue`, `TransitionButton.vue`).
- Use `<script setup lang="ts">` only.
- Prefer `UButton`, `UCard`, `UForm`, `UInput`, `UTable` from Nuxt UI.

## Testing

- Vitest for unit tests of stores and composables (co-located `*.spec.ts`).
- Playwright E2E lives under `frontend/tests/e2e/` (installed later).

## What you don't do

- No state management libraries besides Pinia.
- No CSS-in-JS.
- No touching backend code.
- No adding packages without noting why in the commit message.
```

- [ ] **Step 3: Commit**

```bash
git add .claude/agents/
git commit -m "chore(claude): add nestjs-backend and nuxt-frontend subagents"
git push
```

---

## Task 13: Claude Code — Hooks (`.claude/settings.json` + `.claude/hooks/format.sh`)

**Files:**
- Create: `.claude/hooks/format.sh` (executable)
- Create: `.claude/settings.json`

- [ ] **Step 1: Verify `jq` is available (hook dependency)**

Run: `jq --version`
Expected: prints a version string. If missing, `brew install jq`.

- [ ] **Step 2: Create the hook script `.claude/hooks/format.sh`**

```bash
#!/usr/bin/env bash
# Auto-format files edited by Claude Code.
# Reads the tool event JSON from stdin, extracts file_path,
# and runs eslint --fix + prettier --write in the appropriate sub-project.
# Silent on errors (formatters shouldn't block agent work).

set -u
FILE=$(jq -r '.tool_input.file_path // empty' 2>/dev/null || true)
[ -z "${FILE:-}" ] && exit 0

case "$FILE" in
  */backend/*.ts)
    (cd backend && npx --no-install eslint --fix "$FILE" >/dev/null 2>&1; npx --no-install prettier --write "$FILE" >/dev/null 2>&1) || true
    ;;
  */frontend/*.ts|*/frontend/*.vue|*/frontend/*.mjs|*/frontend/*.js|*/frontend/*.cjs)
    (cd frontend && npx --no-install eslint --fix "$FILE" >/dev/null 2>&1; npx --no-install prettier --write "$FILE" >/dev/null 2>&1) || true
    ;;
esac

exit 0
```

- [ ] **Step 3: Mark the hook script executable**

Run: `chmod +x .claude/hooks/format.sh && ls -l .claude/hooks/format.sh`
Expected: `-rwxr-xr-x` permissions shown.

- [ ] **Step 4: Write `.claude/settings.json`**

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/format.sh"
          }
        ]
      }
    ]
  },
  "permissions": {
    "allow": [
      "Bash(cd backend && npm run *)",
      "Bash(cd frontend && npm run *)",
      "Bash(npm run *)",
      "Bash(npx nuxi:*)",
      "Bash(npx nest:*)",
      "Bash(git status)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git push)",
      "Bash(git pull)"
    ]
  }
}
```

- [ ] **Step 5: Verify the JSON parses**

Run: `jq . .claude/settings.json >/dev/null && echo OK`
Expected: `OK`.

- [ ] **Step 6: Smoke test the hook manually**

Run:

```bash
echo '{"tool_input":{"file_path":"'"$PWD"'/backend/src/main.ts"}}' | .claude/hooks/format.sh && echo DONE
```
Expected: `DONE` printed, no errors. (The script is intentionally silent on formatter output.)

- [ ] **Step 7: Commit**

```bash
git add .claude/hooks/ .claude/settings.json
git commit -m "chore(claude): add auto-format hook script and permission allowlist"
git push
```

---

## Task 14: Claude Code — Local Settings with MCP Secrets (gitignored)

**Files:**
- Create: `.claude/settings.local.json` (gitignored)

- [ ] **Step 1: Verify `.claude/settings.local.json` is gitignored**

Run: `git check-ignore -v .claude/settings.local.json`
Expected: Output pointing to the `.gitignore` line that matches.

- [ ] **Step 2: Write `.claude/settings.local.json`**

This file never enters git. It registers the MongoDB MCP server (needed during backend development). The Render API key is parked in a `_notes` field for Plan 3, when we wire up the Render MCP.

**Executor note:** Substitute the placeholders below with the actual secrets the user shared earlier in the chat (MongoDB SRV string with user + password, and the Render API key starting with `rnd_`). Never place the real values into any other file, and never commit this file.

```json
{
  "mcpServers": {
    "mongodb": {
      "command": "npx",
      "args": ["-y", "mongodb-mcp-server"],
      "env": {
        "MDB_MCP_CONNECTION_STRING": "<MONGODB_SRV_FROM_CHAT>"
      }
    }
  },
  "_notes": {
    "renderApiKey": "<RENDER_API_KEY_FROM_CHAT> — used in Plan 3 when registering the Render MCP. Do not commit."
  }
}
```

The connection string must end with `/iceberg?appName=Icebergdigitaltask` so Mongoose uses the right database by default (the user-provided URI currently has no database path).

- [ ] **Step 3: Confirm Claude Code picks up the MongoDB MCP server**

Restart the Claude Code session (`/exit` then relaunch) so the MCP config reloads. After restart, the `mongodb` MCP tools (e.g. listing collections) should appear via `ToolSearch`.

Run: `ls -la .claude/settings.local.json && echo OK`
Expected: `OK`.

- [ ] **Step 4: Confirm the file is NOT staged**

Run: `git status --short .claude/`
Expected: `settings.local.json` does not appear; only tracked files show.

*(No commit — this file must never enter git.)*

---

## Task 15: GitHub Actions — CI Workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend:
    name: backend-lint-typecheck-test
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
          cache-dependency-path: backend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm run test -- --coverage --passWithNoTests

  frontend:
    name: frontend-lint-typecheck-build
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run build
```

- [ ] **Step 2: Commit and push to trigger CI**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add backend + frontend lint/build/test workflow"
git push
```

- [ ] **Step 3: Verify CI passes on the push**

Run: `gh run list --limit 1`
Expected: A `CI` run in `in_progress` or `completed` state. Watch until green:

Run: `gh run watch`
Expected: Both `backend` and `frontend` jobs succeed.

If CI fails, read the logs, fix the root cause locally, and push again. Do not disable checks.

---

## Task 16: Seed `DESIGN.md` and `README.md` Stubs

**Files:**
- Create: `DESIGN.md`
- Create: `README.md`

- [ ] **Step 1: Write `DESIGN.md`**

```markdown
# DESIGN.md — Iceberg Transactions

> Status: scaffold — expanded as backend and frontend land.

## Source brief

See `docs/technical-case.pdf`.

## Approved design spec

See `docs/superpowers/specs/2026-04-19-iceberg-transactions-design.md`.

## Sections to be filled

- Architecture overview
- Module responsibilities
- Data model justification (agents / transactions / commission_breakdowns)
- State machine and commission engine decisions
- Error handling and validation strategy
- Frontend state management layout
- Deployment topology

Each backend and frontend plan will append to this document as features land.
```

- [ ] **Step 2: Write `README.md`**

```markdown
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
npm install
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

Design spec: `docs/superpowers/specs/2026-04-19-iceberg-transactions-design.md`.
Plans: `docs/superpowers/plans/`.
```

- [ ] **Step 3: Commit**

```bash
git add DESIGN.md README.md
git commit -m "docs: seed DESIGN.md and README.md stubs"
git push
```

---

## Task 17: Final Verification Pass

- [ ] **Step 1: Repo state check**

Run: `git status --short`
Expected: clean working tree.

- [ ] **Step 2: Backend still green**

```bash
cd backend
npm run lint
npm run build
npm run test -- --passWithNoTests
cd ..
```
Expected: all three commands exit 0.

- [ ] **Step 3: Frontend still green**

```bash
cd frontend
npm run lint
npm run build
cd ..
```
Expected: both commands exit 0.

- [ ] **Step 4: CI green on GitHub**

Run: `gh run list --limit 3`
Expected: latest run for `main` shows `success`.

- [ ] **Step 5: Files inventory**

Confirm every expected path exists:

Run:

```bash
for f in \
  .nvmrc \
  .specify/memory/constitution.md \
  .claude/agents/nestjs-backend.md \
  .claude/agents/nuxt-frontend.md \
  .claude/settings.json \
  .claude/settings.local.json \
  .github/workflows/ci.yml \
  .env.example \
  DESIGN.md \
  README.md \
  backend/package.json \
  backend/src/app.module.ts \
  backend/src/main.ts \
  backend/src/config/env.validation.ts \
  backend/.env.example \
  frontend/package.json \
  frontend/nuxt.config.ts \
  frontend/app.vue \
  frontend/pages/index.vue \
  frontend/.env.example; do
    [ -e "$f" ] && echo "OK  $f" || echo "MISS $f"
done
```
Expected: every line starts with `OK`.

- [ ] **Step 6: No secrets in tracked files**

Run:

```bash
git grep -E 'rnd_[A-Za-z0-9]+|mongodb\+srv://[^<]*:[^<]*@' -- ':!docs/technical-case.pdf'
```
Expected: **no output**. If anything prints, stop and scrub it (rewrite history if needed with `git filter-repo`) before the plan is considered done.

- [ ] **Step 7: Celebrate with a tag**

```bash
git tag -a v0.0.1-foundation -m "Foundation & scaffolding complete"
git push --tags
```

---

## Done state

- Root repo has `.nvmrc`, `CLAUDE.md`, `DESIGN.md`, `README.md`, `.env.example`, `.gitignore`, `.specify/`, `.claude/`, `.github/workflows/ci.yml`, `docs/`.
- `backend/` is a buildable NestJS 10 app with Mongoose + ConfigModule + ValidationPipe + Swagger + env validation.
- `frontend/` is a buildable Nuxt 3 app on port 3001 with Nuxt UI + Pinia + ESLint/Prettier.
- Sub-agents `nestjs-backend` and `nuxt-frontend` are registered.
- Hooks auto-lint-and-format backend and frontend files on edit.
- MCP servers (mongodb, render) resolve via `.claude/settings.local.json` (gitignored).
- CI runs green on `main`.
- No credentials tracked.
- Tag `v0.0.1-foundation` pushed.

Next: **Plan 2 — Backend Implementation** (Money VO → state machine → commission engine → modules → APIs → deploy to Render).
