# ~/.codex/AGENTS.md
# AGENTS.md

Three independent projects, no root workspace. `cd` into one before running anything:
- `backend-ts/` — Express 5 + Sequelize 6 + MySQL + Redis. Path alias `#/*` → `src/*` (package `imports` + `tsconfig` + `tsc-alias`).
- `client/` — Remix 2.15 + Vite + `remix-flat-routes`. Path alias `~/*` → `app/*`. Package manager is **yarn 1.22** (`packageManager` pinned).
- `packages/ui/` — standalone Storybook component lib, not consumed by `client` (client's `workspaces` points at nonexistent `./app/packages/*`).

Full conventions live in `opencode.jsonc` → `.opencode/rules/` (`CODE_INSTRUCTION`, `REMIX_RULES`, `PROJECT_WORKFLOW`, `TESTING_GUIDE`, `DOCUMENT_UPDATE`). Follow those; this file is only the non-obvious parts.

## Services & env (backend won't boot without these)

- `docker-compose up -d database redis` → MySQL `:3306` (root/mysql), Redis `:6379`, Adminer `:8080`.
- Backend loads env via Node `--env-file`, not dotenv: `dev:be` uses `.env.example`, `dev:env` uses `.env`. Frontend needs `VITE_API_PATH=http://localhost:3001/api`.
- Production boot fails without `JWT_SECRET_KEY`; browser origins come from `CORS_ORIGINS` (csv). Old defaults were hardcoded `root/mysql` — rotate if still in use.
- MySQL requires `ONLY_FULL_GROUP_BY` disabled: `SET GLOBAL sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''));`

## Commands

```bash
# backend-ts (npm; pre-commit hook runs `npm test`)
npm run dev:be        # backend only, uses .env.example
npm run dev           # backend + swagger-gen concurrently
npm run test:run -- src/services/<name>/__tests__/<file>.test.ts
npm run type-check    # tsc --noEmit
npm run build         # tsc + tsc-alias (alias rewrite required for dist)
npm run db:setup    # first install: create DB + migrate + seed + fix ONLY_FULL_GROUP_BY
npm run db:init     # create DB + migrate only
npm run db:create   # create DB only
npm run db:migrate / npm run db:migrate:undo / npm run seed:all

# client (yarn)
yarn dev              # Vite port 3333 (not 3000)
yarn typecheck        # tsc (noEmit)
yarn lint
yarn test:run app/hooks/__tests__/use-permission.test.tsx
```

## Gotchas that break agents

- **Client loaders/actions are auto-wrapped.** `vite.config.ts:autoContextPlugin` rewrites every `export async function loader/action` in `app/routes/` with `autoWrapContext`. Do NOT call `parseCookieFromRequest`/`withContext` in routes; in `app/action.server/*.service.ts` use `getContext()` from `action.server/context.server` — `http/index.server.ts` forwards it as `Cookie: session=<token>`, `X-Vendor`, `X-Warehouse` headers. Backend auth reads the `session` cookie.
- **Remix routes use flat-routes:** `+` = nesting dir, `$` = param prefix (not `:`).
- **Backend `swagger-output.json` is generated** (`swagger-gen` watches `src/`). Never hand-edit; `src/index.ts` reads it synchronously at boot so a missing file crashes startup.
- **Backend mutates schema on boot:** `database.load().then(database.sync())` runs in `start()`. Prefer `db:migrate` for schema changes; expect dev DB drift.
- **Backend tests never touch a DB.** `test/setup.ts` mocks `#/database` and direct model imports (`product`, `inventory`, `category`, `tag`, `units`, `productVariant`, `productAttribute`, `productAttributeValue`, `transfer`). New services importing other models directly must add a mock line there or tests hit real Sequelize.
- **Coverage gates differ:** backend thresholds are 30% (`vitest.config.js`); client coverage only `include`s `libs/**`, `constants/schema/**`, `i18n/**`, `store/**`, `use-permission.ts`, `permission-guard.tsx` at 80% — tests elsewhere don't move the gate.
- **Lint:** backend is eslint-9 flat + `perfectionist/recommended-natural` (import sort enforced) + `strictTypeChecked`; client is eslint-8. Fix import order instead of disabling.
- **First install flow:** `npm run db:setup` wraps `scripts/init-db.js` (creates the DB, runs `sequelize-cli db:migrate`, then seeders) — see `document/database-init.md`. `scripts/init-db.js` and `scripts/run-seeds.js` read `DB_*` env with `database.json` fallback (same as `src/configs/database.js`). Seeder `20260820000001-seed-workspace.js` covers baseline demo data (demo login `seed-staff@example.com` / `password123`); later seeders resolve the demo vendor via it, so **keep its timestamp earliest**.
- `README.md` still says Strapi v5 — stale; real backend is `backend-ts` Express.
