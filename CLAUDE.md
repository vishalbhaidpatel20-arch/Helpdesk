# Helpdesk

AI-powered ticket management system. Support emails become tickets; Claude classifies them, summarizes them, and suggests replies drawn from a knowledge base. Agents work tickets from a dashboard, and admins manage agents.

Reference docs in the repo root:
- `project-scope.md` — problem, solution, feature list
- `tech-stack.md` — chosen technologies
- `implementation-plan.md` — phased build plan (setup → auth → ...)

## Structure

Bun workspaces monorepo (`client`, `server`).

- `client/` — React 19 + TypeScript, Vite, Tailwind CSS v4, React Router
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
- Secrets live in `.env` (loaded with dotenv); never commit them.

## Documentation lookup (Context7)

The `context7` MCP server is configured for this project. Always use it to fetch current documentation instead of relying on memory when working with any library, framework, SDK, or API. This matters here because the stack uses recent major versions (React 19, React Router 8, Vite 8, Tailwind 4, Express 5, Prisma 7, TypeScript 6) whose APIs differ from older training data.

1. Call `resolve-library-id` with the library name to get its Context7 ID.
2. Call `query-docs` with that ID and a specific question.

Use it for API syntax, configuration, setup, version migration, and library-specific debugging (e.g. Prisma driver adapters, React Router data APIs, Tailwind v4 config, Express 5 routing, Anthropic SDK usage). Skip it for general programming concepts or business-logic questions.
