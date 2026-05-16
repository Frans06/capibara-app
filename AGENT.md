# Capibara App — Agent Context

Turborepo monorepo. Package scope prefix: `@capibara`. Package manager: pnpm. Node ≥ 22.21.

## Repo structure

```
apps/
  tanstack-start/      Web app (TanStack Start + React 19 + Tailwind v4). Hosts tRPC + Better Auth.
  expo/                Mobile app (Expo SDK 54 + React Native 0.81 + NativeWind v5)
  receipt-extractor/   Cloudflare Worker — vision OCR for uploaded receipts (Mistral Small 3.1 on Workers AI)
packages/
  api/                 tRPC v11 routers (auth, receipt)
  auth/                Better Auth factory (initAuth) — shared, initialized per-app
  db/                  Drizzle schema + Vercel-Postgres client + Better-Auth-generated tables
  ui/                  shadcn/ui component library
  validators/          Shared Zod schemas
tooling/
  eslint/              Shared ESLint presets (base, react, nextjs)
  prettier/            Shared Prettier config
  tailwind/            Shared Tailwind theme (includes --sidebar-* tokens)
  typescript/          Shared tsconfigs
```

## Common commands

```bash
# Web + expo + packages
pnpm dev                # All apps except the worker (which needs its own TTY)
pnpm dev:worker         # Receipt extractor on localhost:8787 (run in a second terminal)
pnpm build              # Build all
pnpm typecheck          # tsc across all packages
pnpm lint               # ESLint across all packages
pnpm format:fix         # Prettier --write

# Database (Drizzle + Supabase)
pnpm db:push            # Apply schema changes
pnpm db:studio          # Open Drizzle Studio
# Workaround for self-signed Supabase cert if db:push fails on TLS:
#   NODE_TLS_REJECT_UNAUTHORIZED=0 pnpm --filter @capibara/db exec dotenv -e ../../.env -- drizzle-kit push

# Better Auth schema generation
pnpm auth:generate      # Regenerates packages/db/src/auth-schema.ts (after editing packages/auth)

# UI components
pnpm ui-add             # Interactive shadcn/ui installer

# New workspace package
pnpm turbo gen init
```

## Key architectural decisions

### tRPC
- Routers in `packages/api/src/router/` (`auth.ts`, `receipt.ts`). Root in `packages/api/src/root.ts`.
- Context (`createTRPCContext`) injects `db`, `session`, `authApi`.
- `protectedProcedure` throws `UNAUTHORIZED` if no session and narrows `ctx.session.user`.
- **`@capibara/api` must be a prod dep only in the web app**; in expo it's a dev dep. Prevents backend code leaking into client bundles while preserving type safety.

### Database
- ORM: Drizzle (`@vercel/postgres` driver for the web/API).
- App schema: `packages/db/src/schema.ts`.
- Auth tables: `packages/db/src/auth-schema.ts` — **generated**, do not edit by hand; regenerate with `pnpm auth:generate`.
- `Receipt.userId` has FK to `user.id` with `onDelete: "cascade"`.
- `receiptRelations` + `userRelations` defined for Drizzle's query builder.
- `RECEIPT_CATEGORIES` (const tuple) and `ReceiptItem` (interface) exported for cross-app reuse.

### Authentication
- Library: Better Auth.
- Factory `initAuth()` in `packages/auth/src/index.ts`; each app calls it with its own `baseUrl`, `productionUrl`, `secret`.
- Web (`apps/tanstack-start/src/auth/server.ts`): `auth` is wrapped in `createIsomorphicFn().server(initAuth(...)).client(null)` so client bundles don't try to read `env.AUTH_SECRET`.
- Server-side session: `getSession` is a TanStack Start server function exported from the same file. Route guards call it in `beforeLoad` and expose `session` via `Route.useRouteContext()`.
- CLI-only config for schema generation: `packages/auth/script/auth-cli.ts` — never import in app code.
- Plugins always active: `oAuthProxy`, `expo()`. Email + password enabled.

### Receipt feature
- **Storage:** Cloudflare R2 via S3-compatible API. Browser uploads with pre-signed PUT URLs (5 min); browser views with pre-signed GET URLs (15 min). The `@aws-sdk/client-s3` v3 default checksum is disabled (`requestChecksumCalculation: "WHEN_REQUIRED"`) — R2 doesn't accept it and browsers can't send the header back.
- **Bucket CORS:** must allow `GET, PUT, HEAD` from your dev origin and `Content-Type` header for uploads to work.
- **Extraction worker:** `apps/receipt-extractor` listens on POST `/extract`, verified by `Authorization: Bearer ${SHARED_SECRET}`. Pulls image from its R2 binding, calls Mistral Small 3.1 24B on Workers AI, parses with `jsonrepair` + tolerant Zod (`.catch(null)` per field), computes weighted completeness score, writes back to Postgres via raw `postgres-js` (not Drizzle — see "Drizzle dual-module hazard").
- **Trigger:** fire-and-forget POST from `receipt.create` in the API after the INSERT. Failure doesn't block the upload UX; the row stays `status="pending"` and can be reprocessed.
- **Editable:** the `receipt.update` mutation lets users correct AI mistakes (store, totals, line items, category, etc.). Detail page has an Edit toggle.

### Routes (TanStack Router file-based)
- `routes/login.tsx`, `routes/signup.tsx` — public; redirect to `/` if already authed.
- `routes/_authenticated.tsx` — pathless layout: sidebar (responsive — desktop fixed, mobile overlay) + `beforeLoad` auth guard. Exposes `session` in route context.
- `routes/_authenticated/index.tsx` — dashboard with quick stats.
- `routes/_authenticated/receipts/index.tsx` and `routes/_authenticated/receipts/$id.tsx` — list and detail.
- **Don't** use dot-notation `receipts.$id.tsx` next to `receipts.tsx` — Tan Stack Router treats that as parent/child (parent needs `<Outlet />` to render the child). Use directory structure instead.

### Theme
- Theme tokens in `tooling/tailwind/theme.css` (light/dark, OKLch, with full `--sidebar-*` palette).
- `themeDetectorScript` from `@capibara/ui/theme` is injected directly into `<head>` in `routes/__root.tsx` (NOT inside `ThemeProvider`). React 19 rejects non-async inline scripts outside `<head>`, and it needs to run before paint anyway.

## Drizzle dual-module hazard

`@capibara/db` ships `drizzle-orm` as a runtime dep. With pnpm's peer-dep hashing, each consumer (web, worker) may end up with a separate physical drizzle-orm copy. `sql\`now()\`` from one and `instanceof SQL` in another no longer agree, so Drizzle falls through to `mapToDriverValue` (which calls `.toISOString()` on a SQL object) → `TypeError`.

**Mitigations in the codebase:**
- The worker doesn't use Drizzle at all; raw `postgres-js` SQL templates in `apps/receipt-extractor/src/db.ts`.
- `receipt.update` in the API explicitly sets `updatedAt: new Date()` in `.set()` to bypass the schema's `$onUpdateFn`.

If you add new UPDATE mutations, set `updatedAt` explicitly. A future cleanup is to add `pnpm.overrides` for drizzle-orm at the root, or move drizzle-orm to peer deps in `@capibara/db`.

## Cloudflare Worker dev specifics

- The worker's `wrangler.toml` declares per-binding `remote = true` on the R2 and AI bindings so `wrangler dev` uses **real** Cloudflare resources locally (local R2 simulator is empty; AI has no local equivalent). Requires `wrangler login`.
- Don't confuse with the `--remote` CLI flag, which runs the *whole worker* on Cloudflare's edge — different feature.
- For local dev, secrets go in `apps/receipt-extractor/.dev.vars` (not `.env`). For production, use `wrangler secret put POSTGRES_URL` and `wrangler secret put SHARED_SECRET`.
- Worker is excluded from root `pnpm dev` because wrangler's interactive TUI doesn't compose with `turbo watch dev`'s output multiplexing (EPIPE crash). Use `pnpm dev:worker` in a second terminal.

## Environment variables

Declared in `turbo.json` → `globalEnv`:

| Variable | Purpose |
|---|---|
| `POSTGRES_URL` | Supabase connection string |
| `AUTH_SECRET` | Better Auth signing secret (`openssl rand -base64 32`) |
| `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` | Discord OAuth (optional) |
| `AUTH_REDIRECT_PROXY_URL` | OAuth proxy URL for expo dev |
| `CLOUDFLARE_R2_ACCOUNT_ID` | Cloudflare account ID |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | R2 API token key ID |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `CLOUDFLARE_R2_BUCKET_NAME` | Bucket name (`receipts-capibara`) |
| `RECEIPT_EXTRACTOR_URL` | Worker URL (dev: `http://localhost:8787`) |
| `RECEIPT_EXTRACTOR_SECRET` | Bearer secret; must match the worker's `SHARED_SECRET` |

Copy `.env.example` → `.env`. The worker has its own `.dev.vars` for `POSTGRES_URL` and `SHARED_SECRET`.

## Add a new package or component
- New workspace package: `pnpm turbo gen init`
- New shadcn/ui component: `pnpm ui-add`
- New tRPC procedure: add to `packages/api/src/router/<domain>.ts`, then `pnpm --filter @capibara/api build` so the dist `.d.ts` reflects the new procedure (the web app imports via `dist/index.d.ts`).
