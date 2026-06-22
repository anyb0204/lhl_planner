# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Latter House Life Planner** — a faith-based digital life planner SaaS (brand anchor: Haggai 2:9). Multi-user with private data isolation and a Stripe subscription paywall (free / regular / premium tiers).

## Commands

```bash
# Typecheck all packages
pnpm run typecheck

# Build everything (typecheck + all packages)
pnpm run build

# Regenerate API client hooks and Zod schemas from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Push DB schema changes to PostgreSQL (dev only)
pnpm --filter @workspace/db run push

# Seed Stripe products (idempotent)
pnpm --filter @workspace/scripts run seed-products

# Run the API server in dev mode (builds then starts)
pnpm --filter @workspace/api-server run dev

# Run the frontend dev server
pnpm --filter @workspace/latter-house run dev

# Typecheck a single package
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/latter-house run typecheck
```

## Architecture

### Monorepo Layout

```
artifacts/
  api-server/     — Express 5 backend (@workspace/api-server)
  latter-house/   — React 19 + Vite SPA (@workspace/latter-house)
lib/
  api-spec/       — Single source of truth: lib/api-spec/openapi.yaml
  api-zod/        — Generated Zod schemas (do not edit by hand)
  api-client-react/ — Generated TanStack Query hooks (do not edit by hand)
  db/             — Drizzle ORM schema + pg pool
  integrations-openai-ai-server/  — OpenAI server-side helpers
  integrations-openai-ai-react/   — OpenAI client-side helpers
  replit-auth-web/  — (legacy name) Clerk web helpers
scripts/          — Seed scripts
```

### API Codegen Pipeline

`lib/api-spec/openapi.yaml` → Orval → two generated outputs:
- `lib/api-zod/src/index.ts` — Zod schemas for every request/response body
- `lib/api-client-react/src/generated/` — TanStack Query hooks for the frontend

**Always run codegen after editing the OpenAPI spec.** The codegen script post-processes `api-zod/src/index.ts` to eliminate duplicate export conflicts.

### Backend (`artifacts/api-server`)

- **Entry**: `src/index.ts` → `src/app.ts`
- **Routes**: `src/routes/index.ts` registers all routers behind a `pathGate` helper that prevents routers with a global `requireAuth` from intercepting paths belonging to other routers.
- **Middleware chain order (critical)**:
  1. `express.raw()` for `/api/stripe/webhook` — must be before `express.json()`
  2. `clerkProxyMiddleware` — streams raw bytes, must be before body parsers
  3. `cors`, `express.json()`, `express.urlencoded()`
  4. `clerkMiddleware` (populates Clerk auth context)
  5. Route handlers
- **Auth middlewares** (in `src/middlewares/`):
  - `requireAuth` — extracts `auth.userId` from Clerk and sets `req.user = { id }`. Apply first.
  - `requireTier(minimumTier)` — preferred tier gate; returns 503 (not 403) when Stripe is unreachable (fail-closed). Tiers: `"free" | "regular" | "premium"`.
  - `requireSubscription` — legacy, checks for any active subscription; prefer `requireTier` for new routes.
- **Owner bypass**: Users matching `OWNER_USER_IDS` or `OWNER_EMAILS` env vars skip subscription checks.
- **Build**: esbuild bundles to `dist/index.mjs` (CJS). Production serves the SPA static files from `../../latter-house/dist`.

### Database (`lib/db`)

- Drizzle ORM over `node-postgres`. Connection via `DATABASE_URL` env var.
- **Public schema** (managed by Drizzle + `drizzle-kit push`): `users`, `sessions`, `planner_entries`, `tasks`, `brain_dumps`, `medications`, `health_appointments`, `health_conditions`, `financial_entries`, `goals`, `conversations`, `messages`, and more.
- **Stripe schema** (managed by `stripe-replit-sync`, never touch manually): `stripe.products`, `stripe.prices`, `stripe.customers`, `stripe.subscriptions`, etc. The `StripeStorage` class in `api-server/src/lib/stripeStorage.ts` queries this schema via raw `sql` tagged templates.
- **Every app table has a `userId` column.** All queries must filter by `req.user.id`.

### Frontend (`artifacts/latter-house`)

- React 19 + Vite + Tailwind CSS v4 + shadcn/ui (Radix primitives) + wouter (routing) + TanStack Query
- **`src/App.tsx`** is the root. Auth flow:
  1. `ClerkProvider` wraps everything.
  2. `AppRouter` checks `isSignedIn`; unauthenticated visitors see `LandingPage`.
  3. After sign-in, `useSubscriptionTier` fetches `GET /api/stripe/subscription-status` with retry and caches the result in localStorage (`lhl_sub_tier_v2`) for 1 hour. Only `"regular"` and `"premium"` are cached; `"free"` is always re-verified.
  4. Tier is provided to the whole tree via `TierContext`. Use `useTier()` to read it.
  5. Free users get `FreePlannerRouter`; paid users get full `Router` wrapped in `RemindersProvider`.
  6. First-time paid users are redirected to `/onboarding` until `localStorage("lhl-onboarding-done") === "true"`.
- **`AppLayout`** (`src/components/layout/app-layout.tsx`): responsive sidebar (desktop) + top header + bottom nav bar (mobile). Navigation items gated by tier.
- **`UpgradeGate`** component: wrap premium UI sections to show an upgrade prompt for non-premium users.
- API calls use the generated hooks from `@workspace/api-client-react`. The underlying fetch is `customFetch` from `lib/api-client-react/src/custom-fetch.ts`, which handles auth token injection, base URL, and structured error types (`ApiError`, `ResponseParseError`).

### Subscription Tiers

| Tier | Access |
|------|--------|
| `free` | Landing page / free planner only |
| `regular` | Full planner + all trackers |
| `premium` | Everything + Premium section (Devotional, Weekly Plan, Health Summary, Financial Coaching) |

Product tier is read from `stripe.products.metadata.tier`. Set `metadata.tier = "premium"` on premium Stripe products.

### AI Endpoints

All under `/api/ai/`, powered by `@workspace/integrations-openai-ai-server`. Rate-limited via `src/lib/aiRateLimit.ts`. Model: `gpt-5.4` (set in the route handlers).

- `POST /api/ai/brain-dump-help`
- `POST /api/ai/scripture`
- `POST /api/ai/encouragement`
- `POST /api/ai/truth-generator`
- `POST /api/ai/planner-help`

### Required Environment Variables

See `.env.example`. Key vars:
- `DATABASE_URL` — Neon PostgreSQL connection string
- `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` — Clerk API keys (server)
- `VITE_CLERK_PUBLISHABLE_KEY` — baked into the frontend build
- `VITE_CLERK_PROXY_URL` — optional Clerk proxy
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` — optional; when absent, paywall is disabled
- `OWNER_USER_IDS`, `OWNER_EMAILS` — comma-separated values for owner bypass of subscription checks

### Key Conventions

- `pnpm-workspace.yaml` defines a shared `catalog:` for all pinned dependency versions. Use `catalog:` (not a version string) when adding dependencies that are already in the catalog.
- `minimumReleaseAge: 1440` (1 day) is enforced for all packages except `@replit/*` and `stripe-replit-sync`. Do not disable this.
- TypeScript: `noImplicitAny`, `strictNullChecks`, `useUnknownInCatchVariables` are on. `moduleResolution: "bundler"`. All packages inherit from `tsconfig.base.json`.
- The `pathGate` wrapper in `routes/index.ts` is intentional — it prevents auth middleware in one router from leaking into sibling routes. Always use it when registering a router that applies `router.use(requireAuth)` globally.
- Stripe webhook registration before `express.json()` is a hard requirement — do not move it.
