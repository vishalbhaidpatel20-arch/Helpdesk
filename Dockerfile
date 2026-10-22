# Builds the client, then runs the API (which also serves the built client) on Bun. Used by Railway (see railway.json).
FROM oven/bun:1.4

WORKDIR /app

# Install dependencies first so this layer is cached until a package.json or the lockfile changes
COPY package.json bun.lock ./
COPY core/package.json core/
COPY client/package.json client/
COPY server/package.json server/
RUN bun install --frozen-lockfile

COPY . .

# Vite inlines VITE_* values at build time, so the client's Sentry settings must be available here.
# Railway passes service variables with these names into the build.
ARG VITE_SENTRY_DSN
ARG VITE_SENTRY_ENVIRONMENT

# `prisma generate` only reads the schema, but prisma.config.ts expects DATABASE_URL to exist, so give it a placeholder
RUN DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder bun run --cwd server db:generate \
  && bun run --cwd client build

ENV NODE_ENV=production
# Railway sets PORT at runtime; 3000 is the fallback
EXPOSE 3000

# Database migrations run before each deploy (preDeployCommand in railway.json), not here
CMD ["bun", "run", "--cwd", "server", "start"]
