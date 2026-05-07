# Capibara App

Full-stack monorepo for uploading receipt photos, storing them in Cloudflare R2, and extracting structured data via Cloudflare Workers AI. Built on the create-t3-turbo template.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turbo + pnpm workspaces |
| Mobile | Expo (React Native), Expo Router, Nativewind |
| Web | Next.js 15, React 19, Tailwind CSS |
| API | tRPC v11 (HTTP batch streaming, SuperJSON) |
| Database | PostgreSQL (Supabase), Drizzle ORM |
| Auth | better-auth (email/password, Discord OAuth) |
| UI | Radix UI / shadcn/ui |
| Storage | Cloudflare R2 |
| AI | Cloudflare Workers AI (Llama 3.2 11B Vision) |
| Deployment | Cloudflare Workers (via opennextjs-cloudflare) |
| Validation | Zod |

## Repository Structure

```
apps/
  expo/          # React Native mobile app (Expo Router, Nativewind)
  nextjs/        # Next.js web app (deployed to Cloudflare Workers)
packages/
  api/           # tRPC routers & server (auth, post, receipt)
  auth/          # better-auth setup (Expo plugin, OAuth proxy)
  db/            # Drizzle ORM schema, migrations, client
  ui/            # Shared shadcn/ui components
  validators/    # Shared Zod schemas
tooling/
  eslint/        # Shared ESLint configs (base, nextjs, react)
  prettier/      # Shared Prettier config
  tailwind/      # Shared Tailwind configs (web, native)
  typescript/    # Shared tsconfig base
  github/        # CI/CD setup action
```

## Common Commands

```sh
pnpm dev              # Start all apps in dev mode (turbo watch)
pnpm dev:next         # Start only the Next.js app + deps
pnpm build            # Build everything
pnpm lint             # Lint all packages
pnpm lint:fix         # Lint and auto-fix
pnpm typecheck        # Type-check all packages
pnpm format:fix       # Format all files

# Database (Drizzle)
pnpm db:generate      # Generate a new migration from schema changes
pnpm db:push          # Push schema directly to database (dev only)
pnpm db:migrate       # Run pending migrations
pnpm db:studio        # Open Drizzle Studio GUI
```

## Environment Variables

Copy `.env.example` to `.env` and fill in values. Key variables:

- `POSTGRES_URL` - Supabase PostgreSQL connection string
- `AUTH_SECRET` - Session signing secret (`openssl rand -base64 32`)
- `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` - Discord OAuth credentials
- `APP_URL` - Base URL of the deployed app
- `CF_ACCOUNT_ID` / `CF_API_TOKEN` - Cloudflare account for Workers AI
- `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` / `R2_ENDPOINT` - Cloudflare R2

## Key Patterns

### Adding a New tRPC Router

1. Create router in `packages/api/src/router/<name>.ts`
2. Register it in `packages/api/src/router/index.ts`
3. Use `publicProcedure` or `protectedProcedure` from the tRPC context

### Database Schema Changes

1. Edit schema in `packages/db/src/schema.ts`
2. Run `pnpm db:generate` to create a migration
3. Run `pnpm db:migrate` to apply it (or `pnpm db:push` in dev)

### Auth-Protected Procedures

Use `protectedProcedure` — it verifies `ctx.session?.user` and throws `UNAUTHORIZED` if missing.

### Cloudflare Services

R2 and Workers AI are injected into tRPC context via the Next.js API route handler (`apps/nextjs/src/app/api/trpc/[trpc]/route.ts`). Access them as `ctx.r2` and `ctx.ai` in routers.

## Coding Conventions

- TypeScript strict mode everywhere
- Path aliases: `~/` maps to `src/` in each app
- Database columns use `snake_case` (Drizzle `casing: "snake_case"`)
- Package names are scoped under `@capibara/` (e.g., `@capibara/api`, `@capibara/db`)
- Node.js >= 22.14.0 required

## Deployment

- **Web:** Pushed to `main` triggers GitHub Actions CI which deploys to Cloudflare Workers via `opennextjs-cloudflare` and Wrangler
- **Mobile:** Expo (ejected) — build and deploy via EAS or local builds
- **CI checks:** lint, format, typecheck run on every push
