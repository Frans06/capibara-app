# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev              # Start all apps in watch mode
pnpm build            # Build everything

# Code quality
pnpm typecheck        # tsc across all packages
pnpm lint             # ESLint across all packages
pnpm lint:fix         # ESLint with --fix
pnpm format:fix       # Prettier with --write

# Database
pnpm db:push          # Push Drizzle schema to Supabase
pnpm db:studio        # Open Drizzle Studio UI

# Auth schema generation
pnpm auth:generate    # Regenerate packages/db/src/auth-schema.ts from Better Auth config

# UI components
pnpm ui-add           # Interactive shadcn/ui component installer

# New package scaffold
pnpm turbo gen init
```

There are no automated tests in this repository.

## Architecture

### Monorepo layout

Turborepo monorepo with pnpm workspaces. Package scope: `@capibara`.

- `apps/tanstack-start` — web app (TanStack Start, React 19, Tailwind v4, tRPC client)
- `apps/expo` — mobile app (Expo SDK 54, React Native 0.81, NativeWind v5, tRPC client)
- `packages/api` — tRPC v11 router definitions (server-side only)
- `packages/auth` — Better Auth factory (`initAuth`), shared across apps
- `packages/db` — Drizzle schema, Supabase client
- `packages/ui` — shadcn/ui components for the web app
- `packages/validators` — shared Zod schemas

### tRPC

`packages/api/src/trpc.ts` defines the tRPC context, `publicProcedure`, and `protectedProcedure`. Add new routers under `packages/api/src/router/` and register them in `packages/api/src/root.ts`.

The context (`createTRPCContext`) injects `db` and `session` into every procedure. `protectedProcedure` throws `UNAUTHORIZED` if no session exists and narrows `ctx.session.user` to non-nullable.

The `api` package must be a **production dependency only in the web app**. In Expo (and any other client app) it should be a **dev dependency** — this prevents backend code from leaking into client bundles while still giving full type safety.

### Authentication

`packages/auth/src/index.ts` exports `initAuth()` — a factory that takes `baseUrl`, `productionUrl`, and `secret` and returns a configured Better Auth instance. Each app calls `initAuth` once with its own env values (e.g. `apps/tanstack-start/src/auth/server.ts`).

Always-active plugins: `oAuthProxy` (routes OAuth through the deployed web URL so Expo works in dev/preview) and `expo()`. Email+password is enabled by default.

`packages/auth/script/auth-cli.ts` is a **CLI-only** config used solely for schema generation. Never import it in application code.

### Database

Schema lives in `packages/db/src/schema.ts`. `packages/db/src/auth-schema.ts` is **generated** — do not edit it by hand; run `pnpm auth:generate` after changing Better Auth config, then `pnpm db:push`.

### Environment variables

Declared in `turbo.json` → `globalEnv` so Turborepo caches them correctly:

| Variable | Purpose |
|---|---|
| `POSTGRES_URL` | Supabase connection string |
| `AUTH_SECRET` | Better Auth signing secret (`openssl rand -base64 32`) |
| `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` | Discord OAuth credentials |
| `AUTH_REDIRECT_PROXY_URL` | OAuth proxy URL (set to deployed web app URL) |

Copy `.env.example` → `.env` to get started.
