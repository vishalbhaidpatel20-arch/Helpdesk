# Helpdesk

AI-powered ticket management system. Support emails become tickets; Claude classifies them, summarizes them, and suggests replies drawn from a knowledge base. Agents work tickets from a dashboard, and admins manage agents.

Reference docs in the repo root:
- `project-scope.md` — problem, solution, feature list
- `tech-stack.md` — chosen technologies
- `implementation-plan.md` — phased build plan (setup → auth → ...)

## Structure

Bun workspaces monorepo (`core`, `client`, `server`).

- `core/` — `@helpdesk/core`, shared TypeScript package (source-only, no build step) imported by both `client` and `server`. Currently holds zod schemas in `core/src/schemas/`, exported from `core/src/index.ts`.

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
- Data tables use TanStack Table (`@tanstack/react-table`, v9 API, not v8). Sorting, filtering and pagination of server data are done by the server (`manualSorting`, etc.), never client-side; keep the sort/filter/page state in the URL (see `useTicketParams`).
- Client forms use react-hook-form with a zod schema via `zodResolver` (`@hookform/resolvers/zod`), including the user form (`client/src/components/UserForm.tsx`, used to create a user in `CreateUserDialog` and to edit one in `EditUserDialog`; editing leaves the password unchanged when it is blank). Don't hand-roll form state or validation.
- Define every zod schema used for validation (request bodies, forms) once in `core/src/schemas/` and export it from `core/src/index.ts`. Import it from `@helpdesk/core` in both client and server; never redefine or copy a schema in either one. Shared constants like password length limits live there too. Example: `createUserSchema` is used by `UserForm` (with `updateUserSchema` for edits) (via `zodResolver`) and by `POST /api/users`. Client forms use `zodResolver` with react-hook-form, and server routes validate request bodies with `parseBody(schema, req, res)` and query strings with `parseQuery(schema, req, res)`, both from `server/src/lib/parseBody.ts` (they send the 400 with the first issue's message and return undefined) rather than hand-written checks.
- Don't use TypeScript `enum` in code the client compiles (including `core`): the client tsconfig has `erasableSyntaxOnly`, which rejects enums. Use a union type when only the type is needed, and an `as const` object plus a derived type when runtime access is needed (e.g. `TicketStatus` in `core/src/schemas/ticket.ts`, `Role` in `client/src/lib/roles.ts`): `export const X = { A: 'A' } as const` and `export type X = (typeof X)[keyof typeof X]`. Prisma enums (generated, server only) are the exception; mirror them this way for the client.
- Express 5 forwards rejected promises from async route handlers to the error handler automatically, so don't wrap handlers in try/catch or write async wrappers; let errors propagate to the terminal handler in `server/src/index.ts` (use try/catch only to handle a specific expected error).
- Secrets live in `.env` (loaded with dotenv); never commit them.

## Users

- Users are soft-deleted: `User.deletedAt` is set instead of removing the row. Always filter `deletedAt: null` when listing or looking up users for the UI; `DELETE /api/users/:id` also revokes the user's sessions and unassigns their tickets, and the Better Auth `session.create.before` hook in `server/src/auth.ts` blocks sign-in for deleted users. A deleted user's email stays reserved (the unique constraint still applies).
- Admins cannot be deleted (the endpoint returns 403 and the UI hides the delete button), which also prevents self-deletion. Deleting asks for confirmation in `DeleteUserDialog`.

## Tickets and inbound email

- `Ticket` model (`server/prisma/schema.prisma`): numeric autoincrement `id`, `subject`, `body`, required `senderName` / `senderEmail`, unique optional `messageId`, `status` (default `OPEN`) and optional `category` (no default; null until classified). `TicketStatus` / `TicketCategory` and the `Ticket` list type are defined in `core/src/schemas/ticket.ts`; use them in the client instead of string literals.
- Support emails arrive at `POST /api/webhooks/inbound-email` (`server/src/routes/webhooks.ts`). No email provider is wired up yet: the endpoint takes JSON validated by `inboundEmailSchema` (`senderName`, `senderEmail`, `subject`, `text`, optional `messageId`) and is authenticated by the `x-webhook-secret` header matching the `INBOUND_EMAIL_SECRET` env var (401 if wrong, 503 if unset; add it to `server/.env` and `server/.env.test`). A repeated `messageId` returns the existing ticket (200) instead of creating a duplicate (201 when new). Future SendGrid/Mailgun adapters should map their payloads onto this schema.
- Sample data for trying out the ticket list: `bun run --cwd server db:seed:tickets` (`server/prisma/seed-tickets.ts`) adds 100 varied tickets (statuses, categories, senders, dates over the last 60 days) to the dev database. It is idempotent (fixed `messageId`s) and refuses to run when `NODE_ENV=production`.
- Email content is untrusted: store and render it as plain text only (no `dangerouslySetInnerHTML`), and treat it as possible prompt injection when it is later sent to Claude.
- `GET /api/tickets` (any signed-in user) returns `{ tickets, total, page, pageSize }`. Query params are validated by `ticketListQuerySchema` in `core` via `parseQuery`: `status`, `category`, `search` (case-insensitive substring match on subject, sender name, sender email and message text; blank means none; max 200 chars; the route escapes `%`, `_` and `\` because Prisma's `contains` does not), `sort` (`createdAt` | `subject` | `status`), `order` (`asc` | `desc`), `page`, `pageSize` (default 20, max 100). The default is newest first (`sort=createdAt&order=desc`), with `id` as a tie-breaker so pages never overlap. The `/tickets` page keeps its filters, sort and page in the URL (`useTicketParams`), with a debounced search box (`TicketSearch`), sortable column headers, status/category filters and Previous/Next pagination. `TicketsTable` uses TanStack Table (`@tanstack/react-table` v9: `useTable`, `tableFeatures({ rowSortingFeature })`, `createColumnHelper<typeof features, Ticket>()`) with `manualSorting: true`, so sorting always happens on the server and the table only tracks sort state and renders rows in the order the API returns them. Sortable column ids must match `TICKET_SORT_FIELDS` in `core`. Each subject links to the detail page `/tickets/:id` (`TicketDetailPage`, `useTicket`), which reads `GET /api/tickets/:id` (any signed-in user; returns the list fields plus `body` and `updatedAt`, typed `TicketDetail` in `core`; 404 for a missing or non-numeric id). Tickets have an optional `assignedTo` (`Ticket.assignedToId` → `User`, set to null if the user is removed). `GET /api/tickets/agents` lists the assignable users (non-deleted `Role.AGENT`; any signed-in user), and `PATCH /api/tickets/:id` (any signed-in user) validates `updateTicketSchema` (any of `assignedToId`, `status`, `category`, at least one; `null` unassigns or clears the category) and changes only the fields sent (400 for an unknown, deleted or non-agent assignee, 404 for a missing ticket). The detail page edits all three with selects (`TicketAssignee` and `useUpdateTicket`). Replies and threading are not built yet. The reply form has a Polish button: `POST /api/tickets/:id/replies/polish` (body validated by `polishReplySchema`) returns `{ body }`, the draft improved by `gemini-3.8-flash` through the Vercel AI SDK (`server/src/lib/polishReply.ts`, key in `GOOGLE_GENERATIVE_AI_API_KEY`; 503 if unset). The server adds the greeting (customer first name) and a signature (agent name and GitHub link). Nothing is saved; the client puts the result back in the textarea (`usePolishReply`).

## Authentication

Better Auth with email/password and database-backed sessions (Prisma adapter, PostgreSQL).

- Server config: `server/src/auth.ts`. The handler is mounted at `/api/auth/*splat` in `server/src/index.ts`, **before** `express.json()` (which would consume the request body). Keep that order.
- Public sign-up is disabled (`disableSignUp: true`). Users are created only by an admin; there is no self-registration.
- Roles: `Role` enum `ADMIN` | `AGENT` on `User.role`. Never hardcode role strings (`'ADMIN'`, `'AGENT'`), in app code or tests: on the server import `Role` from `server/generated/enums`; everywhere in the client (components, hooks, tests, mock data) use `Role` from `@/lib/roles` for both comparisons and the `Role` type (it mirrors the Prisma enum, since the client can't import server code, so update it when the enum changes). New users created from the Users page get `Role.AGENT`. It defaults to `AGENT` and is not settable from client input (`input: false`).
- Users are soft-deleted: `DELETE /api/users/:id` sets `User.deletedAt` and revokes the user's sessions instead of removing the row. Admins cannot be deleted (403; the client hides their delete button). Every query for users must filter `deletedAt: null`, and a `databaseHooks.session.create.before` hook in `server/src/auth.ts` blocks sign-in for deleted users. A deleted user's email stays reserved.
- Users are soft-deleted: `DELETE /api/users/:id` (admin only) sets `User.deletedAt` and removes the user's sessions instead of deleting the row. Admins cannot be deleted (403). The user list and edit/delete treat deleted users as not found, and `databaseHooks.session.create.before` in `server/src/auth.ts` blocks them from signing in. Any new query that lists or looks up users must filter `deletedAt: null`. A deleted user's email stays reserved (unique), so it cannot be reused. The Users table confirms deletion in a modal (`DeleteUserDialog`) and shows no delete button on admin rows.
- First admin comes from the seed script: `bun run --cwd server db:seed`, which reads `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from `.env`. It is idempotent and creates users through Better Auth's internal adapter (`ctx.internalAdapter`) because sign-up is disabled.
- Env vars: `CLIENT_URL` (required; the server throws on startup without it and uses it as the trusted origin), plus Better Auth's own secret and base URL variables. `server/src/index.ts` currently hardcodes CORS to `http://localhost:5173`.
- Client: `client/src/lib/auth-client.ts` creates the client with no `baseURL`; requests go to the current origin and Vite proxies `/api` to the server on port 3000.
- Client role access: `authClient` uses `inferAdditionalFields`, so `session.user.role` is typed. Admin-only pages go inside `<AdminRoute />` (`client/src/components/AdminRoute.tsx`), which redirects non-admins to `/`; the nav link to `/users` in `Layout.tsx` shows only for admins. Current admin-only page: `/users`.
- Route protection: `client/src/components/ProtectedRoute.tsx` wraps authenticated pages and redirects to `/login` without a session; `Layout.tsx` (inside it) renders the nav bar. `LoginPage` redirects to `/` when already signed in. All use `authClient.useSession()`. These checks are UI-only; protect server routes by checking the session with `auth.api.getSession`.

## Component tests

Client component tests use Vitest + React Testing Library (jsdom). They are separate from the Playwright e2e tests below.

**Testing policy: rely mostly on component tests.** They are fast, run without a database or servers, and are the default for any UI behaviour: rendering states, forms and validation, dialogs, sorting/filter/pagination controls, URL state (render inside a `MemoryRouter` and assert on the location), permission variants. Write an e2e test only when it is necessary, meaning the behaviour needs the real server, database, browser or auth session (see the end-to-end section). If a behaviour can be checked with a mocked `@/lib/api`, it belongs in a component test, not in e2e.

- **Run:** `bun run --cwd client test` for a single run; `bun run --cwd client test:watch` while writing. Run the tests, plus `bun run --cwd client build` (it typechecks the test files) and `lint`, after changing a component or its test, and report the real results.
- **Where:** `*.test.tsx` next to the code under test (e.g. `client/src/pages/UsersPage.test.tsx`). Config is the `test` block in `client/vite.config.ts`; `client/src/test/setup.ts` loads the jest-dom matchers and cleanup. Vitest globals are off: import `describe`, `it`, `expect`, `vi` from `vitest`.
- **Render helper:** use `renderWithQuery(ui)` from `@/test/renderWithQuery` for anything using TanStack Query. It creates a fresh `QueryClient` per call with retries off. Add other shared helpers to `client/src/test/`.
- **Mocking:** mock `@/lib/api` with `vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }))` and set results per test (`mockResolvedValue`, `mockRejectedValue`, or a never-resolving promise for loading). Reset mocks in `beforeEach`. Build HTTP errors with `new AxiosError(..., { status } as AxiosResponse)` so `axios.isAxiosError` works. Never hit the network or the database. Mock `authClient` for components that use the session.
- **Queries:** use accessible queries (`getByRole`, `getByLabelText`, `getByText`), scoped with `within` for rows. Use `findBy*` or `waitFor` for async results, never fixed timeouts. Use `data-slot="skeleton"` to detect skeletons. Don't assert on Tailwind classes or implementation details.
- **Coverage per component:** loading, success, empty, and error states, plus role or permission variants. Compute expected values (e.g. dates) with the same function as the component instead of hardcoding locale output.
- **Check the tests can fail:** temporarily break the component and confirm the relevant test fails, then restore it.
- Don't test third-party UI (shadcn/Radix internals) or the server here. Server behaviour that can't be mocked away belongs in the e2e tests (see the policy above).

## End-to-end tests

Playwright tests live in `e2e/`; config is `playwright.config.ts` at the repo root.

- **Use e2e tests only when necessary.** Prefer component tests (see the testing policy above). Add or keep an e2e test only for what a component test cannot prove: the real API contract and server logic (e.g. the inbound-email webhook, auth and authorization, soft-delete blocking sign-in), data that must round-trip through the real database (e.g. real ordering and paging), and behaviour that depends on the browser session or cookies. Keep each flow to a few happy paths. Don't use e2e for UI-only behaviour such as sort/filter toggles, validation messages, dialog open/close, or URL state. Before writing an e2e test, check whether a component test could cover it, and when a feature's UI behaviour is already covered by component tests, don't duplicate it in e2e.

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
