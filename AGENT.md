# Capibara App — Agent Context

Turborepo monorepo. Package scope prefix: `@capibara`. Package manager: pnpm. Node ≥ 22.21.

## Repo structure

```
apps/
  tanstack-start/   Web app (TanStack Start + React 19 + Tailwind v4)
  expo/             Mobile app (Expo SDK 54 + React Native 0.81 + NativeWind v5)
packages/
  api/              tRPC v11 router definitions
  auth/             Better Auth config (shared, initialized per-app)
  db/               Drizzle ORM schema + Supabase client
  ui/               shadcn/ui component library
  validators/       Shared Zod schemas
tooling/
  eslint/           Shared ESLint presets
  prettier/         Shared Prettier config
  tailwind/         Shared Tailwind theme
  typescript/       Shared tsconfigs
```

## Common commands

```bash
pnpm dev              # Start all apps in watch mode
pnpm build            # Build all packages and apps
pnpm typecheck        # Run tsc across all packages
pnpm lint             # ESLint across all packages
pnpm lint:fix         # ESLint with --fix
pnpm format:fix       # Prettier with --write

pnpm db:push          # Push Drizzle schema to Supabase
pnpm db:studio        # Open Drizzle Studio

pnpm auth:generate    # Regenerate Better Auth schema → packages/db/src/auth-schema.ts

pnpm ui-add           # Interactive shadcn/ui component installer

turbo gen init        # Scaffold a new workspace package
```

## Key architectural decisions

### tRPC
- Routers live in `packages/api/src/router/` (one file per domain, e.g. `post.ts`, `auth.ts`)
- Root router assembled in `packages/api/src/root.ts`
- Both web and mobile apps consume the same `@capibara/api` package

### Database
- ORM: Drizzle with PostgreSQL (Supabase)
- App schema: `packages/db/src/schema.ts`
- Auth schema: `packages/db/src/auth-schema.ts` — **generated, do not edit by hand**; regenerate with `pnpm auth:generate`
- Client exported from `packages/db/src/client.ts`

### Authentication
- Library: Better Auth
- Shared factory `initAuth()` exported from `packages/auth/src/index.ts`; each app calls it with its own `baseUrl`, `productionUrl`, and `secret`
- CLI-only config for schema generation: `packages/auth/script/auth-cli.ts` — do not import this in app code
- Plugins always active: `oAuthProxy`, `expo()`; email+password enabled by default

### Environment variables (declared in `turbo.json` globalEnv)
| Variable | Purpose |
|---|---|
| `POSTGRES_URL` | Supabase connection string |
| `AUTH_SECRET` | Better Auth signing secret |
| `AUTH_REDIRECT_PROXY_URL` | OAuth proxy URL (Next.js deployment) |
| `PORT` | App port override |

### Adding a new package
Run `pnpm turbo gen init` from the repo root and follow the prompts. The generator wires up `package.json`, `tsconfig.json`, and all tooling automatically.

### Adding a UI component
Run `pnpm ui-add` from the repo root and select the component interactively. Components land in `packages/ui`.

## Important notes

- The `api` package should be a **dev dependency** in client apps (Expo) and a **production dependency** only in the server-rendered web app. This prevents backend code from leaking to clients.
- After any schema change, run `pnpm db:push` to sync with the database.
- After any Better Auth config change, run `pnpm auth:generate` to regenerate `auth-schema.ts`, then run `pnpm db:push`.
