# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev              # Run all apps EXCEPT the worker (which has its own TTY)
pnpm dev:worker       # Run the receipt-extractor Cloudflare Worker on localhost:8787
pnpm build            # Build everything

# Code quality
pnpm typecheck        # tsc across all packages
pnpm lint             # ESLint across all packages
pnpm lint:fix         # ESLint with --fix
pnpm format:fix       # Prettier with --write

# Database (Drizzle + Supabase)
pnpm db:push          # Apply schema changes to the database
pnpm db:studio        # Open Drizzle Studio
# If TLS verification fails on the self-signed Supabase cert:
#   NODE_TLS_REJECT_UNAUTHORIZED=0 pnpm --filter @capibara/db exec dotenv -e ../../.env -- drizzle-kit push

# Better Auth schema regeneration (run after editing packages/auth)
pnpm auth:generate    # Regenerates packages/db/src/auth-schema.ts

# Worker deployment (Cloudflare)
pnpm --filter @capibara/receipt-extractor exec wrangler secret put POSTGRES_URL
pnpm --filter @capibara/receipt-extractor exec wrangler secret put SHARED_SECRET
pnpm --filter @capibara/receipt-extractor deploy
```

No automated tests in this repo.

## Architecture

### Apps
- `apps/tanstack-start` — web app. TanStack Start + React 19 + Tailwind v4. Hosts tRPC and Better Auth handlers.
- `apps/expo` — mobile app (Expo SDK 54). Shares the tRPC API and `@capibara/auth`.
- `apps/receipt-extractor` — Cloudflare Worker that runs vision OCR on uploaded receipts. Triggered by the API after `receipt.create`.

### Shared packages
- `packages/api` — tRPC v11 routers (`auth`, `receipt`). Exported via `@capibara/api`.
- `packages/auth` — Better Auth factory (`initAuth`). Each app calls it with its own env.
- `packages/db` — Drizzle schema + Vercel-Postgres client. Schema includes Better Auth tables (generated via `pnpm auth:generate`) and `Receipt`.
- `packages/ui` — shadcn/ui components for the web app.
- `packages/validators` — shared Zod schemas.

### Receipt pipeline (most non-obvious flow)
1. Browser requests pre-signed PUT URL via `trpc.receipt.getUploadUrl`, uploads directly to R2.
2. Browser calls `trpc.receipt.create` with `{ fileKey, fileName, mimeType }`. API inserts a row with `status="pending"` and **fires a fire-and-forget POST** to the receipt-extractor worker (URL in `RECEIPT_EXTRACTOR_URL`, Bearer secret `RECEIPT_EXTRACTOR_SECRET`).
3. Worker pulls the file from R2 via its R2 binding, calls Mistral Small 3.1 24B on Workers AI (`@cf/mistralai/mistral-small-3.1-24b-instruct`), repairs the JSON with `jsonrepair`, validates with Zod (with `.catch(null)` per field so one bad field doesn't kill the row), computes a weighted completeness score in `src/score.ts`, and writes the row back to Postgres.
4. Worker UPDATEs Postgres via **raw `postgres-js` SQL**, not Drizzle. See "Drizzle dual-module hazard" below.

The `receipt.create` route also returns the inserted row, so the UI gets immediate feedback even before extraction completes; the row shows `status="pending"` until the worker updates it.

### tRPC procedures on `receipt`
- `getUploadUrl` — returns pre-signed R2 PUT URL (5 min) + `fileKey`
- `create` — inserts row, triggers worker
- `all` — list user's receipts; each row includes a fresh pre-signed GET URL (15 min)
- `byId` — single receipt with view URL
- `update` — user edits (store, totals, items, category, etc.); **must explicitly set `updatedAt: new Date()`** to avoid the dual-module issue (see below)
- `delete` — removes row and R2 object

### Auth flow
- `apps/tanstack-start/src/auth/server.ts` exports `auth` and a `getSession` server function. `auth` is wrapped in `createIsomorphicFn()` (`.server(initAuth(...)).client(null)`) so the `env.AUTH_SECRET` access is tree-shaken from the client bundle. Otherwise importing `getSession` from any route would crash the browser.
- Route guards use `getSession()` (the server function) in `beforeLoad`; the returned session is exposed via `Route.useRouteContext()` to child components — no need for `authClient.useSession()` inside protected routes.
- Routes structure:
  - `routes/login.tsx` — email/password sign-in via `authClient.signIn.email`
  - `routes/signup.tsx` — email/password sign-up via `authClient.signUp.email`
  - `routes/_authenticated.tsx` — pathless layout: sidebar + auth guard, exposes `session` in route context
  - `routes/_authenticated/index.tsx` — dashboard
  - `routes/_authenticated/receipts/index.tsx` — list (note: uses **directory** routing, not the `receipts.tsx` + `receipts.$id.tsx` dot-notation, which made detail a nested child of list)
  - `routes/_authenticated/receipts/$id.tsx` — detail + inline edit mode

### Theme detector script
Lives **inside `<head>`** in `routes/__root.tsx` (via `themeDetectorScript` exported from `@capibara/ui/theme`), not inside `ThemeProvider`. React 19 rejects non-async inline `<script>` outside `<head>`, and it needs to run before paint anyway to avoid FOUC.

## Drizzle dual-module hazard

`@capibara/db` ships `drizzle-orm` as a runtime dep. pnpm resolves separate virtual stores per peer-dep set (e.g., the worker's drizzle-orm has `@cloudflare/workers-types`, the web's has `@vercel/postgres`). When `sql\`now()\`` from one drizzle-orm instance meets `instanceof SQL` from another, the check fails and Drizzle calls `mapToDriverValue` (which calls `.toISOString()`) on the SQL object — yielding `TypeError: value.toISOString is not a function`.

Two workarounds in the codebase:
1. **Worker:** does not use Drizzle at all. `apps/receipt-extractor/src/db.ts` uses raw `postgres-js` template SQL (`UPDATE receipt SET … updated_at = now() WHERE id = $1`). Schema reused only as types.
2. **API `receipt.update`:** explicitly sets `updatedAt: new Date()` in the `.set()` call to bypass the schema's `$onUpdateFn` (which would otherwise return a `sql\`now()\`` from a foreign drizzle copy).

If you add new UPDATE mutations, prefer providing `updatedAt` explicitly until the dual-module issue is fixed at the pnpm level (root `pnpm.overrides` or moving drizzle-orm to peer deps in `@capibara/db`).

## Cloudflare Worker dev specifics
- `wrangler.toml` declares per-binding `remote = true` on the R2 and AI bindings so local `wrangler dev` uses the **real** R2 bucket and the real Workers AI (the local R2 simulator is empty; AI has no local equivalent). Requires `wrangler login`.
- `--remote` flag on the CLI runs the *whole worker* on Cloudflare's edge — different feature; not what we want here.
- The worker's `dev` script is excluded from the root `pnpm dev` (it doesn't compose with `turbo watch dev`'s output multiplexing — wrangler's interactive TUI dies with EPIPE). Use `pnpm dev:worker` in a separate terminal.

## Environment variables

Declared in `turbo.json` `globalEnv`:

| Variable | Used by | Purpose |
|---|---|---|
| `POSTGRES_URL` | api, worker, drizzle-kit | Supabase connection string |
| `AUTH_SECRET` | api | Better Auth signing secret |
| `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` | api | Discord OAuth (optional) |
| `AUTH_REDIRECT_PROXY_URL` | api | OAuth proxy URL for expo dev |
| `CLOUDFLARE_R2_ACCOUNT_ID` | api | R2 account ID for pre-signed URLs |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | api | R2 API token key ID |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | api | R2 API token secret |
| `CLOUDFLARE_R2_BUCKET_NAME` | api | Bucket name (`receipts-capibara`) |
| `RECEIPT_EXTRACTOR_URL` | api | Worker base URL (e.g. `http://localhost:8787`) |
| `RECEIPT_EXTRACTOR_SECRET` | api | Bearer secret; must match worker's `SHARED_SECRET` |

The worker has additional **wrangler secrets** (not in `.env`): `POSTGRES_URL` and `SHARED_SECRET`. Set with `wrangler secret put`. For local dev, place them in `apps/receipt-extractor/.dev.vars`.

Copy `.env.example` → `.env` to get started.

## Receipt schema notes
- `Receipt.userId` has `.references(() => user.id, { onDelete: "cascade" })` — deleting a Better Auth user cascades to their receipts.
- `RECEIPT_CATEGORIES` and `ReceiptItem` are exported from `@capibara/db/schema` for cross-app reuse.
- `extractionScore` (0–100) is computed by the worker with weighted completeness — not from AI confidence.
- `items` is JSONB; reuses the `ReceiptItem` TypeScript type via `$type<>()`. Worker writes via `JSON.stringify(items)::jsonb` cast (the `sql.json()` helper from postgres-js has overly strict types).
