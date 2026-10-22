# Optional self-hosting image (not used on Vercel, see DEPLOYMENT.md): builds the client, then runs the API, which also
# serves the built client, on Bun.
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
# Pass them as build args (--build-arg) when building the image.
ARG VITE_SENTRY_DSN
ARG VITE_SENTRY_ENVIRONMENT

# `prisma generate` only reads the schema, but prisma.config.ts expects DATABASE_URL to exist, so give it a placeholder
RUN DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder bun run --cwd server db:generate \
  && bun run --cwd client build

ENV NODE_ENV=production
# PORT can be set at runtime; 3000 is the fallback
EXPOSE 3000

# Database migrations are not run here: apply them with `bun run --cwd server db:deploy` before starting
CMD ["bun", "run", "--cwd", "server", "start"]
