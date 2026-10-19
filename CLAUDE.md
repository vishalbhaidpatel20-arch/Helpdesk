# Helpdesk

AI-powered ticket management system. Support emails become tickets; Claude classifies them, summarizes them, and suggests replies drawn from a knowledge base. Agents work tickets from a dashboard, and admins manage agents.

Reference docs in the repo root:
- `project-scope.md` — problem, solution, feature list
- `tech-stack.md` — chosen technologies
- `implementation-plan.md` — phased build plan (setup → auth → ...)

## Structure

Bun workspaces monorepo (`client`, `server`).

- `client/` — React 19 + TypeScript, Vite, Tailwind CSS v4, shadcn/ui (radix-nova), React Router
  - `client/src/components/ui/` shadcn components; `@/` aliases `client/src/`
- `server/` — Express 5 + TypeScript running on Bun, Prisma 7 with PostgreSQL (`@prisma/adapter-pg`)
  - `server/prisma/` schema and migrations; `server/generated/` is Prisma client output (do not edit)

## Commands

Run from the repo root unless noted.

- `bun install` — install all workspace dependencies
- `bun run dev:server` / `bun run dev:client` — start each dev server
- `bun run dev` — start both
- `bun run --cwd client build` — typecheck and build the client
- `bun run --cwd client lint` — lint client with oxlint
- `bun run --cwd server typecheck` — typecheck the server
- `bun run --cwd server db:migrate` — create/apply a Prisma migration
- `bun run --cwd server db:generate` — regenerate the Prisma client

## Conventions

- Use Bun as the package manager and runtime (not npm/yarn/pnpm).
- TypeScript everywhere; ES modules (`"type": "module"`).
- Authentication uses database-backed sessions, not JWTs.
- AI features (classification, summaries, suggested replies) use the Claude API.
- Ticket statuses: Open, Resolved, Closed. Categories: General Question, Technical Question, Refund Request.
- Client styling is Tailwind utilities and shadcn/ui components with the default theme. No custom CSS: `client/src/index.css` holds only the Tailwind/shadcn theme output.
- After `bunx shadcn add`, check new files in `components/ui/` for `from "cn"` (an unrelated npm package) and change it to `@/lib/utils`. Don't add `baseUrl` to the tsconfigs (deprecated in TS 6); the `@/*` alias uses `paths` only.
- Secrets live in `.env` (loaded with dotenv); never commit them.

## Authentication

Better Auth with email/password and database-backed sessions (Prisma adapter, PostgreSQL).

- Server config: `server/src/auth.ts`. The handler is mounted at `/api/auth/*splat` in `server/src/index.ts`, **before** `express.json()` (which would consume the request body). Keep that order.
- Public sign-up is disabled (`disableSignUp: true`). Users are created only by an admin; there is no self-registration.
- Roles: `Role` enum `ADMIN` | `AGENT` on `User.role`. It defaults to `AGENT` and is not settable from client input (`input: false`).
- First admin comes from the seed script: `bun run --cwd server db:seed`, which reads `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from `.env`. It is idempotent and creates users through Better Auth's internal adapter (`ctx.internalAdapter`) because sign-up is disabled.
- Env vars: `CLIENT_URL` (required; the server throws on startup without it and uses it as the trusted origin), plus Better Auth's own secret and base URL variables. `server/src/index.ts` currently hardcodes CORS to `http://localhost:5173`.
- Client: `client/src/lib/auth-client.ts` creates the client with no `baseURL`; requests go to the current origin and Vite proxies `/api` to the server on port 3000.
- Client role access: `authClient` uses `inferAdditionalFields`, so `session.user.role` is typed. Admin-only pages go inside `<AdminRoute />` (`client/src/components/AdminRoute.tsx`), which redirects non-admins to `/`; the nav link to `/users` in `Layout.tsx` shows only for admins. Current admin-only page: `/users`.
- Dev test agent (local only): `agent@example.com` / `password123`, role `AGENT`, created via the internal adapter like the seed admin.
- Route protection: `client/src/components/Layout.tsx` wraps authenticated pages and redirects to `/login` without a session. `LoginPage` redirects to `/` when already signed in. Both use `authClient.useSession()`. These checks are UI-only; protect server routes by checking the session with `auth.api.getSession`.

## Documentation lookup (Context7)

The `context7` MCP server is configured for this project. Always use it to fetch current documentation instead of relying on memory when working with any library, framework, SDK, or API. This matters here because the stack uses recent major versions (React 19, React Router 8, Vite 8, Tailwind 4, Express 5, Prisma 7, TypeScript 6) whose APIs differ from older training data.

1. Call `resolve-library-id` with the library name to get its Context7 ID.
2. Call `query-docs` with that ID and a specific question.

Use it for API syntax, configuration, setup, version migration, and library-specific debugging (e.g. Prisma driver adapters, React Router data APIs, Tailwind v4 config, Express 5 routing, Anthropic SDK usage). Skip it for general programming concepts or business-logic questions.
