# Capibara

Capibara is a personal finance app that turns photos of receipts into structured, searchable spending data. Upload a receipt, an AI vision model extracts the store, totals, line items and category, and the dashboard visualizes where your money goes over time.

## Features

- **Receipt capture** — upload an image or PDF; it's stored in Cloudflare R2 and queued for extraction.
- **AI extraction** — a Cloudflare Worker runs vision OCR (Mistral Small 3.1 on Workers AI), repairs and validates the JSON, and writes structured fields back to the database.
- **Edit & correct** — every extracted field and line item is editable; a weighted completeness score flags receipts that need review.
- **Spending dashboard** — spending-over-time, category breakdown and top-merchant charts with a Week / Month / Year selector.
- **Web + mobile** — a TanStack Start web app and an Expo mobile app sharing one typesafe tRPC API and auth.

## Architecture

A [Turborepo](https://turborepo.com) monorepo. Packages are namespaced `@capibara/*`.

```text
apps
  ├─ tanstack-start    Web app — TanStack Start, React 19, Tailwind v4. Hosts the tRPC + Better Auth handlers.
  ├─ expo              Mobile app — Expo SDK 54, shares the tRPC API and @capibara/auth.
  └─ receipt-extractor Cloudflare Worker — vision OCR on uploaded receipts, triggered after a receipt is created.
packages
  ├─ api               tRPC v11 routers (auth, receipt).
  ├─ auth              Better Auth factory (initAuth); each app calls it with its own env.
  ├─ db                Drizzle schema + Postgres (Supabase) client.
  ├─ ui                shadcn/ui components for the web app.
  └─ validators        Shared Zod schemas.
tooling
  ├─ eslint · prettier · tailwind · typescript   Shared, extendable configs.
```

### Receipt pipeline

1. Browser requests a pre-signed R2 upload URL (`trpc.receipt.getUploadUrl`) and uploads the file directly to R2.
2. Browser calls `trpc.receipt.create`; the API inserts a row with `status="pending"` and fires a POST to the receipt-extractor Worker.
3. The Worker pulls the file from R2, calls the vision model, repairs/validates the JSON, computes a completeness score, and updates the row to `status="processed"`.
4. The UI shows the row immediately as `pending`; a **Rescan** action can re-run extraction on demand.

More implementation detail and non-obvious gotchas live in [`CLAUDE.md`](./CLAUDE.md).

## Tech stack

TanStack Start · Expo · tRPC v11 · Better Auth · Drizzle ORM · Supabase Postgres · Cloudflare R2 + Workers AI · Tailwind v4 · shadcn/ui · Zustand · Recharts.

## Getting started

> Requires the toolchain in [`package.json#engines`](./package.json). Use **pnpm**.

### 1. Install & configure

```bash
pnpm install

# Environment variables — see .env.example for the full list
cp .env.example .env

# Push the Drizzle schema to your database
pnpm db:push
```

Required env (declared in `turbo.json` `globalEnv`): `POSTGRES_URL`, `AUTH_SECRET`, the `CLOUDFLARE_R2_*` keys, `RECEIPT_EXTRACTOR_URL`, and `RECEIPT_EXTRACTOR_SECRET`. The Worker additionally needs `POSTGRES_URL` and `SHARED_SECRET` set as wrangler secrets (or `apps/receipt-extractor/.dev.vars` for local dev).

### 2. Generate the Better Auth schema

Run this after any change to `packages/auth`. It regenerates `packages/db/src/auth-schema.ts`.

```bash
pnpm auth:generate
```

### 3. Run it

```bash
# Web + mobile (everything except the Worker)
pnpm dev

# The receipt-extractor Worker has its own TTY — run it in a separate terminal
pnpm dev:worker
```

The Worker uses real R2 and Workers AI even in local dev (the local R2 simulator is empty and Workers AI has no local equivalent), so it needs `wrangler login`.

## Common commands

```bash
pnpm build          # Build everything
pnpm typecheck      # tsc across all packages
pnpm lint           # ESLint across all packages
pnpm lint:fix       # ESLint --fix
pnpm format:fix     # Prettier --write
pnpm db:studio      # Open Drizzle Studio
pnpm ui-add         # Add a shadcn/ui component
```

There are no automated tests in this repo.

## Deployment

- **Web (tanstack-start)** — deploy as a Turborepo app (e.g. Vercel), with the same env vars set in the hosting provider. The web app must be deployed for the mobile app to reach the API in production.
- **Receipt-extractor Worker** — set its secrets and deploy via wrangler:

  ```bash
  pnpm --filter @capibara/receipt-extractor exec wrangler secret put POSTGRES_URL
  pnpm --filter @capibara/receipt-extractor exec wrangler secret put SHARED_SECRET
  pnpm --filter @capibara/receipt-extractor deploy
  ```

- **Mobile (expo)** — distribute via EAS Build / Submit; point `getBaseUrl` at the deployed web API.

## Credits

Bootstrapped from [create-t3-turbo](https://github.com/t3-oss/create-t3-turbo).
