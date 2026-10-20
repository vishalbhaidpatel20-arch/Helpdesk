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
- `bun run --cwd client test` — run client component tests (Vitest + React Testing Library, jsdom; files are `*.test.tsx` next to the code, setup in `client/src/test/setup.ts`; mock `@/lib/api` rather than the network)
- `bun run --cwd client test:watch` — Vitest watch mode: reruns affected component tests on every save, for writing tests
- `bun run test:e2e` — run the Playwright e2e tests (`test:e2e:ui` for the UI runner)

## Conventions

- Use Bun as the package manager and runtime (not npm/yarn/pnpm).
- TypeScript everywhere; ES modules (`"type": "module"`).
- Authentication uses database-backed sessions, not JWTs.
- AI features (classification, summaries, suggested replies) use the Claude API.
- Ticket statuses: Open, Resolved, Closed. Categories: General Question, Technical Question, Refund Request.
- Client styling is Tailwind utilities and shadcn/ui components with the default theme. No custom CSS: `client/src/index.css` holds only the Tailwind/shadcn theme output.
- After `bunx shadcn add`, check new files in `components/ui/` for `from "cn"` (an unrelated npm package) and change it to `@/lib/utils`. Don't add `baseUrl` to the tsconfigs (deprecated in TS 6); the `@/*` alias uses `paths` only.
- Client data fetching: use axios, never `fetch`, through the shared instance in `client/src/lib/api.ts` (`baseURL: '/api'`). Wrap calls in TanStack Query (`@tanstack/react-query`) with `useQuery` / `useMutation`, usually in a hook under `client/src/hooks/` (see `useUsers`), and pass the query's `signal` to axios. Don't fetch in `useEffect` with manual loading/error state. Better Auth calls go through `authClient`, not axios. The query cache is cleared on sign-out.
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
- Route protection: `client/src/components/ProtectedRoute.tsx` wraps authenticated pages and redirects to `/login` without a session; `Layout.tsx` (inside it) renders the nav bar. `LoginPage` redirects to `/` when already signed in. All use `authClient.useSession()`. These checks are UI-only; protect server routes by checking the session with `auth.api.getSession`.

## Component tests

Client component tests use Vitest + React Testing Library (jsdom). They are separate from the Playwright e2e tests below.

- **Run:** `bun run --cwd client test` for a single run; `bun run --cwd client test:watch` while writing. Run the tests, plus `bun run --cwd client build` (it typechecks the test files) and `lint`, after changing a component or its test, and report the real results.
- **Where:** `*.test.tsx` next to the code under test (e.g. `client/src/pages/UsersPage.test.tsx`). Config is the `test` block in `client/vite.config.ts`; `client/src/test/setup.ts` loads the jest-dom matchers and cleanup. Vitest globals are off: import `describe`, `it`, `expect`, `vi` from `vitest`.
- **Render helper:** use `renderWithQuery(ui)` from `@/test/renderWithQuery` for anything using TanStack Query. It creates a fresh `QueryClient` per call with retries off. Add other shared helpers to `client/src/test/`.
- **Mocking:** mock `@/lib/api` with `vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }))` and set results per test (`mockResolvedValue`, `mockRejectedValue`, or a never-resolving promise for loading). Reset mocks in `beforeEach`. Build HTTP errors with `new AxiosError(..., { status } as AxiosResponse)` so `axios.isAxiosError` works. Never hit the network or the database. Mock `authClient` for components that use the session.
- **Queries:** use accessible queries (`getByRole`, `getByLabelText`, `getByText`), scoped with `within` for rows. Use `findBy*` or `waitFor` for async results, never fixed timeouts. Use `data-slot="skeleton"` to detect skeletons. Don't assert on Tailwind classes or implementation details.
- **Coverage per component:** loading, success, empty, and error states, plus role or permission variants. Compute expected values (e.g. dates) with the same function as the component instead of hardcoding locale output.
- **Check the tests can fail:** temporarily break the component and confirm the relevant test fails, then restore it.
- Don't test third-party UI (shadcn/Radix internals) or the server here. Server routes and full user flows belong in the e2e tests.

## End-to-end tests

Playwright tests live in `e2e/`; config is `playwright.config.ts` at the repo root.

- **Use the `e2e-test-writer` subagent (`.claude/agents/e2e-test-writer.md`) for writing, updating, or fixing e2e tests.** Do not write Playwright tests directly in the main session.
- Isolated test environment: Playwright starts the API on port 3001 and the client on port 5174 (never the dev ports 3000/5173). `server/scripts/test-server.ts` loads `server/.env.test` (gitignored; copy from `.env.test.example`), then resets and seeds the separate `helpdesk_test` database before each run. It refuses any database name not ending in `_test`.
- The seed creates only the admin (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env.test`). Tests that need other users, such as an agent, must create them themselves, since public sign-up is disabled.
- Rate limiting is production-only, so tests can sign in repeatedly.
- `prisma migrate reset` is blocked for AI agents by Prisma's safeguard. If it blocks a run, stop and ask the user to run it; never set `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` without the user's explicit consent.

## Documentation lookup (Context7)

The `context7` MCP server is configured for this project. Always use it to fetch current documentation instead of relying on memory when working with any library, framework, SDK, or API. This matters here because the stack uses recent major versions (React 19, React Router 8, Vite 8, Tailwind 4, Express 5, Prisma 7, TypeScript 6) whose APIs differ from older training data.

1. Call `resolve-library-id` with the library name to get its Context7 ID.
2. Call `query-docs` with that ID and a specific question.

Use it for API syntax, configuration, setup, version migration, and library-specific debugging (e.g. Prisma driver adapters, React Router data APIs, Tailwind v4 config, Express 5 routing, Anthropic SDK usage). Skip it for general programming concepts or business-logic questions.
