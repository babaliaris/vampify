# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Vampify (`@vampify/core`) is an opinionated Fastify framework with a fixed stack: Fastify + TypeBox type provider, MySQL (mysql2) + Drizzle ORM, JWT/cookie auth, pino logging, and `node:test`. It is **not published to npm**. Consumer projects get it as a git submodule at `external/vampify`, created by `src/scripts/create-vampify.sh`, and import it through tsconfig path aliases.

The repo has three parts under `src/`:

- `src/core/`: the framework itself. This is the only part consumer projects compile (`tsconfig.build.json` excludes `sandbox`, `create-template` and `vampify-test.ts`).
- `src/sandbox/`: a sample app inside this repo that exercises the core. All npm scripts (dev, tests, migrations, drizzle config) target the sandbox.
- `src/create-template/`: files that `create-vampify.sh` copies into a new project. It is a separate app with its own routes (e.g. `logs.ts`), API schemas and `log_shipper.ts`; it is not a copy of the sandbox. The script also generates the new project's `package.json` (dependencies copied from this repo's `package.json`), `tsconfig.json` and `tsconfig.build.json`. **Changes to dependencies, scripts or path aliases here usually need matching changes in `create-vampify.sh`.**

## Commands

```bash
npm run dev            # tsx watch src/sandbox/server.ts (NODE_ENV=development)
npm run build          # tsc + tsc-alias into dist/
npm run lint           # eslint (typescript-eslint, no-floating-promises & await-thenable are errors)
npm run test:unit      # src/sandbox/tests/unit/**/*.{test,spec}.ts
npm run test:e2e       # src/sandbox/tests/e2e/**/*.e2e.ts, --test-concurrency=1
npm run test:e2e:file -- src/sandbox/tests/e2e/auth.e2e.ts   # run a single test file
npm run db:generate    # drizzle-kit generate from src/sandbox/db/schema.ts into drizzle/
npm run db:migrate     # generate, then migrate both the dev and test databases
```

Tests use the built-in `node:test` runner through `tsx`. E2E tests need a running MySQL with the database from `.env.test`, already migrated.

## Environment

- `NODE_ENV` (`development` | `test` | `production`) selects which `.env.<NODE_ENV>` file is loaded from `process.cwd()`. `server.ts`, `migrate.ts`, `drizzle.config.ts` and `vampify-test.ts` (which always loads `.env.test`) all call `dotenv` themselves. `@fastify/env` then validates `process.env` against `VampifyEnvSchema` in `src/core/plugins/environment.ts` (it runs with `dotenv: false`).
- Mode checks (`vampifyIsDevMode/ProdMode/TestMode`) read `NODE_ENV`, not `RUN_MODE`.
- To add an env var: add it to `VampifyEnvSchema`. That updates the type of `fastify.getEnvs()` and the global `process.env` typing.
- `LOG_METHOD`: `pretty` | `stdout` | `roll` | `roll_and_stdout`. `LOGGING=false` turns logging off. Rolling logs are written to `logs/` (production) or `logs-dev/`.

## Logging pipeline

- **User id.** The `req` serializer runs only for the `'incoming request'` line, which is logged before any preHandler, so it cannot know the user. Instead, `vampifyAuthenticate` binds `vampify_user_id` with `setBindings()`. That changes the request's logger in place, so `reply.log` (which writes `'request completed'`) sees it too; reassigning `req.log` with `child()` would not.
  - `req.log` is typed `FastifyBaseLogger`, which hides pino-only methods, and when `LOGGING=false` Fastify uses a no-op logger that lacks them. The `vampifyIsPinoLogger()` type guard in `auth.ts` checks for `bindings()`/`setBindings()` before use.
  - `setBindings()` appends instead of overwriting, so the binding is skipped when `vampify_user_id` is already in `req.log.bindings()` (e.g. `vampifyAuth` running twice in one request).
  - Service-key requests (`vampifyServiceAuth`) and guest requests bind no `vampify_user_id`.
- **Shipping.** The template's `log_shipper.ts` reads pino JSON from stdin (`node app.js | node log_shipper.js`). It truncates fields to the column limits, maps `vampify_user_id` to a numeric `user_id`, and POSTs rows with `x-service-api-key` to the template's `/vampify-logs` route, which stores `req.body.user_id`. It reports rejected rows once per batch.
- Downstream apps keep hand-maintained copies of `log_shipper.ts` and the logs route/schema, so changes here have to be ported to them manually.
- `src/sandbox/tests/e2e/logging.e2e.ts` boots its own instance with an in-memory logger, because `vampifySetupE2E` uses `.env.test` (`LOGGING=false`).

## Core architecture

`vampifyPlugin` (`src/core/vampify.ts`) is a `fastify-plugin` that registers, in this order: env → global error handler → database → `@fastify/sensible` → auth → utilities. An app's `app.ts` registers `vampifyPlugin` with its Drizzle `schema`, then autoloads `plugins/` and `routes/` with `@fastify/autoload`. The app also augments `FastifyInstance.db` with its own `MySql2Database<typeof schema>` type.

Path aliases (in `tsconfig.json`; `tsc-alias` rewrites them at build time): `@/*` → `src/*`, `@vampify/core|env|auth|literals|test|utils` → files in `src/core/`. Imports use ESM `.js` extensions (`NodeNext`).

Each core plugin adds decorators and declares their types with `declare module 'fastify'` in the same file:

- **database** (`plugins/database.ts`): a mysql2 pool with `dateStrings` and `bigNumberStrings`, exposed as `fastify.db`. `req.runInTransactionRetry(cb, maxRetries)` wraps `cb` in a transaction and retries on `ER_LOCK_DEADLOCK`. Inside a test transaction it skips the retry so deadlocks surface. The `onReady` hook runs `SELECT 1`, so the server fails to start if the DB is unreachable.
- **auth** (`plugins/auth.ts`): `@fastify/jwt` + `@fastify/cookie`.
  - `rep.vampifySignPayload(user_id, body, {device_id, expires, jwt_data, user_role})` signs a JWT that contains a "footprint", the sha256 of (IP or `device_id`) + user-agent. Without `device_id`, the token is set as an HttpOnly, Secure, SameSite=None cookie (`VAMPIFY_PAYLOAD_COOKIE`). With `device_id` (native/mobile clients), it is returned in the body.
  - Guards: `fastify.vampifyAuth` checks the JWT and the footprint, then sets `req.vampify_payload` and binds `vampify_user_id` to the request logger with `req.log.setBindings()`. Native clients send the `x-vampify-device-id` header.
  - Other guards: `fastify.vampifyRequireRolesAuth(roles)` (run it after `vampifyAuth`) and `fastify.vampifyServiceAuth` (static `x-service-api-key` compared to `LOG_SHIPPER_KEY` in constant time).
- **utilities** (`plugins/utilities.ts`): `req.vampifyAbort(condition, status, debugMsg, payload?, runBeforeAbort?)` works like an assert. If `condition` is falsy, it logs the message and throws a sensible HTTP error. In production the response message is replaced with a generic reason code (`VAMPIFY_DEBUG_MSG.REASON`). If `runBeforeAbort` is async, it returns a Promise and must be awaited; the overloads in its type declaration encode this.
- **error handler** (`utilities/vampify-error-hanlder.ts`, filename misspelled on purpose, do not rename casually): turns TypeBox validation errors into 400 and MySQL errors (`ER_DUP_ENTRY` → 409, FK/too-long/out-of-range → 400) into fixed responses. It hides details/stack outside dev/test. It also installs one process-wide `unhandledRejection` handler that exits the process.
- `vampify-literals.ts`: `VampifyInstance` type, constants, and `VampifyStandardResponseErrors`. Routes spread `VampifyStandardResponseErrors` into their `response` schema so error responses get through serialization.

## Testing model

`vampifySetupE2E(vampifyApp, mockRoutes?)` (`src/core/vampify-test.ts`) boots the app once per `describe` with `before`/`after` hooks. `suite.runInTransaction(async (fastify) => …, fk_check?)` opens a transaction and **hot-swaps `fastify.db` with the transaction object**. Route code reached through `fastify.inject()` then runs inside that transaction, which is always rolled back at the end.

Constraints that follow from this:
- Use one `describe()` per `.e2e.ts` file.
- Tests must not run concurrently (no `{ concurrency: true }`). The e2e script uses `--test-concurrency=1`.
- Route code must read `fastify.db` / `req.server.db` at request time, not capture it at registration time, or the swap has no effect.
