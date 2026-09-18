# Database First-Install & Setup

Covers bringing a fresh `backend-ts` install from zero to a seeded, bootable database.

## Quick start

Prerequisite: services running (`docker-compose up -d database redis` at the repo root), Node available, and `npm install` done in `backend-ts/`.

```bash
npm run db:setup    # create DB + migrate + seed + fix ONLY_FULL_GROUP_BY
```

That single command replaces the manual `create database` → `db:migrate` → `seed:all` → sql_mode sequence. When it finishes you can boot with `npm run dev:be` and log in as the demo user.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run db:create` | Create the MySQL schema only (`scripts/init-db.js` with no flags). |
| `npm run db:init` | Create schema + run all migrations. |
| `npm run db:setup` | Create schema + migrate + seed + fix `ONLY_FULL_GROUP_BY`. |
| `npm run db:migrate` / `db:migrate:undo` | Run / roll back the latest migration (sequelize-cli). |
| `npm run seed:all` | `scripts/run-seeds.js up` — idempotent, safe to re-run. |

## What `init-db.js` does

1. Resolves connection config from `DB_*` env vars, falling back to `src/configs/database.json` (same fallback as `src/configs/database.js`, so the CLI and the runtime Sequelize instance always target the same server).
2. Creates the database if it does not exist (with `utf8mb4`/`utf8mb4_unicode_ci`).
3. With `--migrate`: runs `sequelize-cli db:migrate` in the selected env (`development` by default; `--env production` for another Sequelize block).
4. With `--seed`: runs `scripts/run-seeds.js up`.
5. With `--sql-mode` (only part of `db:setup`): disables MySQL `ONLY_FULL_GROUP_BY` globally where allowed.

Flags: `--migrate`, `--seed` (implies `--migrate`), `--sql-mode`, `--env <name>`.

## Migrations

- `migrations/20260101000000-initial-schema.js` is the baseline: creates all 35 tables (`utf8mb4`/`utf8mb4_unicode_ci`), idempotent, and drops in reverse-FK order on undo. It is intentionally the earliest migration, so a fresh DB gets the full schema from migration #1.
- Later schema changes go through `sequelize-cli` migrations, not the baseline.
- The runtime still runs `database.sync({ alter: true })` on boot (`start()`), so expect the boot log to apply small diffs and drop duplicate indexes. The baseline was built to match the Sequelize models exactly, so a fresh DB boots without extra tables being created.

## Seed data

Seeders live in `seeders/` and are run with `scripts/run-seeds.js`. All are idempotent; re-running `npm run seed:all` is safe.

- `20260820000001-seed-workspace.js` — baseline demo data: a `Staff` system role, demo user `seed-staff@example.com` / `password123`, a demo vendor ("Seed Vendor"), the platform warehouse, and permission rows.
- Later seeders (`units`, `providers`, `categories`, `tags`, …) resolve the demo vendor by joining `seed-staff@example.com`, so **`20260820000001-seed-workspace.js` must keep the earliest timestamp** — it runs first.
- Seeders that need DB access read the same `DB_*` env / `database.json` fallback via `scripts/run-seeds.js`.

## Environment & troubleshooting

- Config resolution order: `DB_HOST` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` / `DB_PORT` env vars → `src/configs/database.json`.
- MySQL requires `ONLY_FULL_GROUP_BY` disabled. `db:setup` attempts it (`SET GLOBAL sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))`); on a managed RDS you may need `database.performance_events`/custom parameter group — running `db:init` + `seed:all` separately then still works.
- A pre-existing but empty database (e.g. an old dev `inventory` DB with no tables) is handled: the migrations simply create the missing tables. Tests like `src/utils/__tests__/sequence.concurrency.test.ts` require a migrated dev DB to run against live MySQL.
- If a migration crashes mid-run, `sequelize-cli` records it in the `SequelizeMeta` table — revert with `npm run db:migrate:undo` before fixing and re-running.