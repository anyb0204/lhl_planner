# AGENTS.md

## Cursor Cloud specific instructions

Latter House Life Planner is a **pnpm monorepo**. The runnable app is the Express API (`@workspace/api-server`) plus the Vite React SPA (`@workspace/latter-house`). In production the API serves the built SPA (single server); the Replit dev setup runs them separately.

### Environment
- Use **pnpm** (the root `preinstall` rejects npm/yarn). The startup update script runs `pnpm install`.
- Node 22 works fine even though `.node-version` says 20.
- A local **PostgreSQL 16** is installed. Start it with `sudo pg_ctlcluster 16 main start`. Convention used for local dev: database `lhl_planner`, role `dev`/`dev`, i.e. `DATABASE_URL=postgresql://dev:dev@127.0.0.1:5432/lhl_planner`.
- Apply the Drizzle schema: `DATABASE_URL=... pnpm --filter @workspace/db run push`.

### Run (production-style single server — recommended locally)
The Vite dev server has **no `/api` proxy**, so run the prod single-server to exercise the full app on localhost:
```
pnpm --filter @workspace/latter-house run build
pnpm --filter @workspace/api-server run build
NODE_ENV=production PORT=10000 DATABASE_URL=... <other env> pnpm --filter @workspace/api-server run start
```
Health check: `GET http://127.0.0.1:10000/api/healthz` → `{"status":"ok"}`.

### Non-obvious boot requirements
The api-server **crashes at import** unless ALL of these env vars are present:
- `PORT`, `DATABASE_URL` (throw if missing)
- `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY` (the OpenAI integration client throws at import; placeholders such as `https://api.openai.com/v1` and `sk-placeholder` are enough to boot)
- `CLERK_PUBLISHABLE_KEY` must be a **syntactically valid** Clerk key or the global `@clerk/express` middleware returns 500 on *every* request. Generate a parseable placeholder: `pk_test_$(printf 'valid-clerk.clerk.accounts.dev$' | base64 -w0)` (plus any `sk_test_...` secret key).
- `STRIPE_SECRET_KEY` is optional (paywall is skipped without it).

With placeholders the **backend works end-to-end** (healthz 200, protected routes return 401, SPA HTML is served). The **browser SPA needs a REAL Clerk publishable key** — the client loads `clerk.js` from the live Clerk domain, so a fake key leaves the browser blank.

### Build / typecheck / test
- `pnpm run typecheck` and `pnpm run build` currently **fail** on a pre-existing TypeScript error in `artifacts/api-server/src/routes/memories.ts` (`req.params` typed as `string | string[]`). The actual bundlers (`esbuild` for the API, `vite` for the SPA) do not run `tsc` and build fine.
- No test framework is configured.
