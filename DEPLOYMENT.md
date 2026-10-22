# Deploying to Vercel

One Vercel project serves everything: the built client (`client/dist`, from the CDN) and the API (the Express app in `server/src/app.ts`, run as a Vercel Function through `api/index.ts` on the Bun runtime). Because the browser app and the API share one origin, there is no CORS or cross-site cookie setup. The database is any hosted PostgreSQL (Neon, Supabase, Vercel Postgres, ...).

Files: `vercel.json` (Bun runtime, build command, `/api/*` rewrite to the function, SPA fallback, cron job), `api/index.ts` (function entry), `server/.env.example` (variables).

## How it differs from running a server

Vercel Functions start per request and cannot keep background processes alive, so the pieces that live in `server/src/index.ts` locally work differently here:

| Locally / on a VM | On Vercel |
| --- | --- |
| pg-boss worker processes new tickets | The ticket is processed in the same function after the response is sent (`waitUntil`), so no worker is needed |
| IMAP poller checks the mailbox every minute | A Vercel Cron job calls `GET /api/cron/poll-inbox` (see step 5) |
| Built-in SMTP server | Not available. Leave `SMTP_DOMAIN` unset; use IMAP polling or the webhook |
| Express serves `client/dist` | Vercel's CDN serves it |

## 1. Create the database

Create a PostgreSQL database and copy its **pooled** connection string (Neon: "Pooled connection"; Supabase: the transaction pooler on port 6543). Each function instance opens its own connection, so a pooler is needed to avoid running out of connections.

**Migrations and the pooler:** `prisma migrate deploy` takes a Postgres advisory lock, which a pooled (pgbouncer) connection cannot hold, so the build timed out with P1002. `vercel.json` sets `PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1` for that step. Fine for one deployer at a time, which is how Vercel builds a project.

## 2. Import the project

1. Push the repo to GitHub.
2. Vercel → **Add New → Project** → import the repo. Leave the root directory as the repo root and the framework preset as **Other**; `vercel.json` provides the install, build and output settings.

## 3. Set the environment variables (Project → Settings → Environment Variables)

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | the pooled connection string (needed at **build** time too: the build applies migrations) |
| `BETTER_AUTH_SECRET` | a long random string (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` and `CLIENT_URL` | the public https URL of the deployment, e.g. `https://helpdesk.vercel.app` (or your custom domain) |
| `INBOUND_EMAIL_SECRET` | a long random string |
| `CRON_SECRET` | a long random string; Vercel sends it as `Authorization: Bearer <CRON_SECRET>` to the cron endpoint |
| `GOOGLE_GENERATIVE_AI_API_KEY` | your key (optional; without it tickets skip the AI and open for agents) |
| `IMAP_USER`, `SMTP_PASSWORD` | the support mailbox and its Gmail app password (optional) |
| `SENTRY_DSN`, `SENTRY_ENVIRONMENT=production` | server project DSN (optional) |
| `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT=production` | browser project DSN (optional; baked into the client at **build** time, so redeploy after changing it) |

Do not set `PORT` or `NODE_ENV` (Vercel does). Leave `SMTP_DOMAIN` unset. `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are only needed on your machine for step 4.

## 4. Deploy and create the first admin

Every push builds and deploys. The build runs `prisma generate`, then `prisma migrate deploy` (a failing migration fails the build, so the previous deployment stays live), then the client build.

Public sign-up is disabled, so create the first admin (and the AI agent) once, from your machine against the database:

```
DATABASE_URL="<connection string>" SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD='a strong password' bun run --cwd server db:seed
DATABASE_URL="<connection string>" bun run --cwd server db:seed:ai
```

Then sign in at your Vercel URL and create agents from the Users page. Check `https://<your-domain>/api/health` returns `{"status":"ok"}`.

## 5. Receiving email

- **Webhook (works on every plan, instant):** POST JSON to `https://<your-domain>/api/webhooks/inbound-email` with the header `x-webhook-secret: <INBOUND_EMAIL_SECRET>` (see `CLAUDE.md` for the body).
- **IMAP polling:** set `IMAP_USER` and `SMTP_PASSWORD` (the mailbox needs IMAP enabled and an app password). `vercel.json` registers a cron job for `/api/cron/poll-inbox` that runs **once a day**, because Hobby accounts cannot schedule more often (a more frequent schedule fails the deployment). To poll every few minutes either:
  - on a Pro plan, change the schedule in `vercel.json` to `*/5 * * * *`, or
  - keep the Hobby plan and call `GET https://<your-domain>/api/cron/poll-inbox` with `Authorization: Bearer <CRON_SECRET>` from any external scheduler (cron-job.org, GitHub Actions, ...).

## Notes

- **Function limits:** the API function may run up to 60 seconds (`maxDuration`), which covers the AI calls and a mailbox poll. A very large mailbox backlog is finished by the next poll.
- **Secrets:** any key that was ever pasted into a chat, a ticket or a screenshot should be rotated before going live (Gmail app password, ngrok token, API keys).
- **Rollbacks:** an instant rollback reverts the code, not the database. Write migrations so the previous version still works with them.
- **Custom domain:** add it under Settings → Domains, then update `BETTER_AUTH_URL` and `CLIENT_URL` to match and redeploy, or sign-in will reject the new origin.
- **Preview deployments** get their own URL, so `BETTER_AUTH_URL` / `CLIENT_URL` set for Production will not match them; give previews their own values (and ideally their own database) or sign in on production only.
- **Self-hosting:** the `Dockerfile` still builds a single container that runs `server/src/index.ts` (API, client, IMAP poller and pg-boss worker in one process) for any host that runs containers. It is not used on Vercel.
