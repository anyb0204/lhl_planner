# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI via Replit AI Integrations (`@workspace/integrations-openai-ai-server`)
- **Payments**: Stripe via Replit Integrations (`stripe-replit-sync`)
- **Auth**: Clerk (email/password, no Replit account required)

## Project: Latter House Life Planner

A faith-based digital life planner SaaS — fully multi-user with private data isolation and Stripe subscription paywall.

Brand anchor: Haggai 2:9. Brand colors: sage green sidebar, gold primary.

### Features
- **Daily Planner** — time-blocked schedule, top priorities, tasks checklist, gratitude, notes/reflection
- **Weekly View** — 7-column week grid with navigation
- **Monthly View** — calendar grid month view
- **Brain Dump** — AI-powered thought organizer; takes freeform text, returns organized tasks + follow-up questions
- **Truth Generator** — type a lie/negative belief, receive a countering scripture + affirmation
- **Scripture Button** — generates a fresh daily scripture with reflection each click
- **Encouragement Button** — generates personalized faith-based encouragement each click
- **Help Me Plan** buttons on daily/weekly/monthly views — AI-powered planning suggestions
- **Appointments Tracker** — general appointments (medical, legal, dental, financial, etc.)
- **Health Conditions Tracker** — ongoing conditions with status (active/managed/resolved)
- **Medications Tracker** — medications with dose, times, refill dates
- **Financial Tracker** — income, expenses, tithe, giving, savings by month
- **Goals Tracker** — goals with milestones, progress, categories

### Paywall / SaaS Flow
1. User visits app → sees Login screen
2. User signs in via Replit Auth (popup)
3. App checks `/api/stripe/subscription` — if no active subscription, shows Pricing page
4. User selects Monthly ($9.97/mo) or Yearly ($97/yr) → redirected to Stripe Checkout
5. After payment, webhook syncs subscription → user sees the full planner
6. User can manage billing via Stripe Customer Portal (`POST /api/stripe/portal`)

### Multi-User Data Isolation
Every data table has a `userId` column. ALL queries filter by `req.user.id`. No data leaks between users.
Tables: `planner_entries`, `tasks`, `brain_dumps`, `medications`, `health_appointments`, `health_conditions`, `financial_entries`, `goals`, `conversations`

### Auth
- `requireAuth` middleware in `artifacts/api-server/src/middlewares/requireAuth.ts`
- Applied at router level on all planner, tracker, and Stripe routes
- `authMiddleware` populates `req.user` from session

### AI Endpoints (all via OpenAI gpt-5.4)
- `POST /api/ai/brain-dump-help`
- `POST /api/ai/scripture`
- `POST /api/ai/encouragement`
- `POST /api/ai/truth-generator`
- `POST /api/ai/planner-help`

### Stripe Endpoints
- `GET /api/stripe/products` — list active products with prices
- `POST /api/stripe/checkout` — create Stripe Checkout session (requireAuth)
- `GET /api/stripe/subscription` — get user's current subscription (requireAuth)
- `POST /api/stripe/portal` — create Stripe Customer Portal session (requireAuth)
- `POST /api/stripe/webhook` — Stripe webhook (registered BEFORE express.json())

### DB Tables (public schema)
- `users` — id, email, firstName, lastName, profileImageUrl, stripeCustomerId, stripeSubscriptionId
- `sessions` — Replit Auth session store
- `planner_entries`, `tasks`, `brain_dumps` — all with userId
- `medications`, `health_appointments`, `health_conditions` — all with userId
- `financial_entries`, `goals` — all with userId
- `conversations`, `messages` — conversations has userId

### DB Schema (stripe schema — managed by stripe-replit-sync)
All Stripe data lives in the `stripe` schema: products, prices, customers, subscriptions, etc.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed-products` — seed Stripe products (idempotent)

## Notes
- api-zod codegen script overwrites `lib/api-zod/src/index.ts` after orval runs to prevent duplicate export conflicts
- `lib/integrations-openai-ai-react` and `lib/integrations-openai-ai-server` are from the Replit AI integrations template
- Stripe credentials fetched via Replit connector API (not env vars); uses `publishable`/`secret` field names
- `runMigrations` from stripe-replit-sync must run BEFORE `getStripeSync()` is called
- Stripe webhook must be registered BEFORE `app.use(express.json())` in app.ts

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
