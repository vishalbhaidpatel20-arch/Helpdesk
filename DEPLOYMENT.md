# Deploying to Railway

One Railway service runs everything: the API **and** the built client (the server serves `client/dist` in production), next to a Railway Postgres database. Because the browser app and the API share one origin, there is no CORS or cross-site cookie setup.

Files: `Dockerfile` (builds the client, generates the Prisma client, starts the server), `railway.json` (Dockerfile build, migrations before each deploy, health check on `/api/health`), `.dockerignore`, `server/.env.example`.

## 1. Create the project

1. Push the repo to GitHub.
2. Railway → **New Project** → **Deploy from GitHub repo** → pick the repo. Railway finds `railway.json` and builds with the Dockerfile.
3. In the same project: **New** → **Database** → **PostgreSQL**.

## 2. Set the variables (service → Variables)

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference the database service) |
| `BETTER_AUTH_SECRET` | a long random string (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` and `CLIENT_URL` | the service's public URL, e.g. `https://helpdesk-production.up.railway.app` (generate it under Settings → Networking → Generate Domain first) |
| `INBOUND_EMAIL_SECRET` | a long random string |
| `GOOGLE_GENERATIVE_AI_API_KEY` | your key (optional; without it tickets skip the AI and open for agents) |
| `IMAP_USER`, `SMTP_PASSWORD` | the support mailbox and its Gmail app password (optional) |
| `SENTRY_DSN`, `SENTRY_ENVIRONMENT=production` | server project DSN (optional) |
| `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT=production` | browser project DSN (optional; baked into the client at **build** time, so redeploy after changing it) |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | only needed for the seed in step 4 |

`NODE_ENV=production` is set by the Dockerfile. Do not set `PORT` (Railway does). Leave `SMTP_DOMAIN` unset: Railway cannot receive raw SMTP, so incoming mail comes from IMAP polling or the webhook.

## 3. Deploy

Railway builds and deploys on every push. Before each new version starts, `bun run --cwd server db:deploy` applies pending Prisma migrations; if it fails the deploy stops and the old version keeps running. The deploy is healthy when `/api/health` returns 200.

## 4. One-time data setup

Public sign-up is disabled, so create the first admin (and the AI agent) once. Run these from your machine against the database's **public** URL (Railway → Postgres → Connect → Public Network; the `postgres.railway.internal` address only works inside Railway):

```
DATABASE_URL="<public postgres url>" SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD='a strong password' bun run --cwd server db:seed
DATABASE_URL="<public postgres url>" bun run --cwd server db:seed:ai
```

Then sign in at your Railway URL and create agents from the Users page.

## 5. Receiving email

- **IMAP polling:** set `IMAP_USER` and `SMTP_PASSWORD` (the mailbox needs IMAP enabled and an app password). Mail sent to it becomes tickets.
- **Webhook:** POST JSON to `https://<your-domain>/api/webhooks/inbound-email` with the header `x-webhook-secret: <INBOUND_EMAIL_SECRET>` (see `CLAUDE.md` for the body).

## Notes

- **Run one replica.** The IMAP poller and the ticket worker live in the server process; several replicas would poll the same mailbox. (Duplicate Message-IDs never create duplicate tickets, but the work would be wasted.)
- **Secrets:** any key that was ever pasted into a chat, a ticket or a screenshot should be rotated before going live (Gmail app password, ngrok token, API keys).
- **Rollbacks:** a rollback reverts the code, not the database. Write migrations so the previous version still works with them.
- **Custom domain:** add it under Networking, then update `BETTER_AUTH_URL` and `CLIENT_URL` to match, or sign-in will reject the new origin.
