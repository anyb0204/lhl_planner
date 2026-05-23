# Threat Model

## Project Overview

Latter House Life Planner is a multi-user TypeScript SaaS with a React frontend (`artifacts/latter-house`) and an Express API (`artifacts/api-server`) backed by PostgreSQL/Drizzle. Users store highly sensitive planner, financial, and health data; authentication is handled through Clerk and billing through Stripe. For this scan, the primary review scope is the production financial and health tracker surfaces.

Production assumptions for future scans:
- `NODE_ENV` is `production` in deployed environments.
- TLS is handled by the platform.
- `artifacts/mockup-sandbox` is development-only and should be ignored unless production reachability is demonstrated.

## Assets

- **User accounts and authenticated sessions** — compromise allows an attacker to act as a user and access all private planner, health, and financial records.
- **Health tracker data** — medications, appointments, conditions, notes, doctors, refill dates, and related family information. This is sensitive personal and health-adjacent data.
- **Financial tracker data** — income, expenses, tithe/giving, categories, and balance calculations. This is sensitive personal financial information.
- **Billing state and subscription entitlements** — Stripe customer/subscription linkage determines who is entitled to paid features.
- **Application secrets and third-party capabilities** — Clerk configuration, Stripe credentials, and database access enable privileged account and payment operations.

## Trust Boundaries

- **Browser to API** — all tracker requests cross from an untrusted client into the API. Authentication, authorization, entitlement checks, and input validation must be enforced server-side.
- **API to PostgreSQL** — tracker routes read and write sensitive rows in shared tables. User scoping must be enforced on every query.
- **API to Clerk** — authenticated identity originates outside the application. The app must trust only validated Clerk context.
- **API to Stripe** — subscription state comes from Stripe-backed records and webhook synchronization. Paid-feature access cannot rely only on frontend checks.
- **Public vs authenticated vs paid-user boundary** — some routes are public, many require authentication, and subscription-only features must be enforced separately from sign-in status.

## Scan Anchors

- **Production entry points:** `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/latter-house/src/main.tsx`, `artifacts/latter-house/src/App.tsx`
- **Highest-risk code areas:** `artifacts/api-server/src/routes/trackers.ts`, `artifacts/api-server/src/middlewares/requireAuth.ts`, `artifacts/api-server/src/routes/stripe.ts`
- **Authenticated tracker surfaces:** `/api/trackers/medications`, `/api/trackers/health`, `/api/trackers/conditions`, `/api/trackers/financial`
- **Dev-only area to ignore by default:** `artifacts/mockup-sandbox/**`

## Threat Categories

### Spoofing

Tracker and billing endpoints must accept only requests tied to a valid Clerk-authenticated user. The server must derive the acting user from trusted middleware and must not accept caller-controlled user identifiers for tracker access.

### Tampering

Users can submit free-form financial and health data. The API must validate request bodies and ensure every write is bound to the authenticated user's tenant scope. Business rules that define paid entitlement must also be enforced server-side so clients cannot tamper with access decisions by calling backend endpoints directly.

### Information Disclosure

The application stores sensitive health and financial data. All tracker reads must remain scoped to `req.user.id`, responses must avoid leaking unrelated rows, and logs/errors must not expose secrets or sensitive payloads.

### Denial of Service

Tracker and AI endpoints accept attacker-controlled input and can be called repeatedly by authenticated users. Expensive endpoints and third-party backed flows should tolerate abuse with reasonable limits and failure handling so a single user cannot degrade service for others.

### Elevation of Privilege

The most important privilege boundaries here are tenant isolation and subscription entitlement. A normal authenticated user must never access another user's tracker records, and an unpaid authenticated user must not gain access to subscription-only tracker functionality by bypassing frontend routing or calling the API directly.
