# Vercel deployment plan

A checklist for the first production release. `DEPLOYMENT.md` explains how the Vercel setup works and what each variable is; this plan says what to do, in what order, and how to confirm each step.

## 0. Decisions to make first

| Decision | Recommendation |
| --- | --- |
| Production database | Create a **new** Neon database for production. The current dev database (`neondb`) holds seeded sample tickets and test data. |
| Domain | Start on `https://<project>.vercel.app`. Add a custom domain later (step 7). |
| Vercel plan | Hobby works. Mailbox polling then runs once a day unless an external scheduler calls the cron endpoint (step 6). |
| Email intake | Use the webhook (instant), IMAP polling, or both. Raw SMTP is not available on Vercel. |
| WhatsApp number | The home page chat button needs `VITE_WHATSAPP_NUMBER` (international format, digits only). Without it visitors must pick the contact themselves. |

## 1. Before you deploy (local, about 30 minutes)

- [ ] Run `! bun run test:e2e`. The e2e specs changed this session (sign-in lands on `/dashboard`, sign-out goes home, the assignee filter) and have never been run. Fix any failures.
- [ ] Run `bun run --cwd client test`, `bun run --cwd client build`, `bun run --cwd client lint` and `bun run --cwd server typecheck`. All passed at the last commit.
- [ ] Rotate any secret that was ever pasted into chat, a ticket or a screenshot (Gmail app password, API keys). `DEPLOYMENT.md` calls this out.
- [ ] Decide whether to merge `footer-and-layout-updates` into `main` first. Vercel deploys the branch you connect as Production; every other branch gets a preview.

## 2. Create the production database

- [ ] Create a Neon project and copy the **pooled** connection string. Each function instance opens its own connection, so the pooler is required.
- [ ] Keep the string handy: it is needed at build time (the build applies migrations) and at runtime.

## 3. Create the Vercel project

- [ ] Vercel → Add New → Project → import `vishalbhaidpatel20-arch/Helpdesk`.
- [ ] Root directory: the repo root. Framework preset: **Other**. `vercel.json` already sets install, build, output, the `/api/*` rewrite, the 60 second function limit and the cron job.
- [ ] Production branch: `main`, or `footer-and-layout-updates` if you deploy before merging.

## 4. Environment variables (Settings → Environment Variables → Production)

| Variable | Value | Needed at |
| --- | --- | --- |
| `DATABASE_URL` | pooled Neon string | build and runtime |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` | runtime |
| `BETTER_AUTH_URL` and `CLIENT_URL` | the same public https URL | runtime |
| `INBOUND_EMAIL_SECRET` | long random string | runtime |
| `CRON_SECRET` | long random string | runtime |
| `GOOGLE_GENERATIVE_AI_API_KEY` | your key (optional; without it tickets open straight for agents) | runtime |
| `IMAP_USER`, `SMTP_PASSWORD` | support mailbox and its app password (optional) | runtime |
| `SENTRY_DSN`, `SENTRY_ENVIRONMENT=production` | optional | runtime |
| `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT=production` | optional | **build** |
| `VITE_WHATSAPP_NUMBER` | e.g. `919876543210` | **build** |

Never set `PORT`, `NODE_ENV` or `SMTP_DOMAIN`. `VITE_*` values are baked into the client at build time, so redeploy after changing them.

Chicken-and-egg: `BETTER_AUTH_URL` and `CLIENT_URL` must equal the final URL. Deploy once to get the `.vercel.app` URL, set both variables, then redeploy.

## 5. First deploy and first admin

- [ ] Deploy. The build runs `prisma generate`, `prisma migrate deploy`, the server build and the client build. A failing migration fails the build and the previous deployment stays live.
- [ ] Create the first admin and the AI agent from your machine, against the production database:

```
DATABASE_URL="<production string>" SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD='a strong password' bun run --cwd server db:seed
DATABASE_URL="<production string>" bun run --cwd server db:seed:ai
```

  The AI agent matters: while it exists every new ticket is assigned to it, so agents' "My tickets" view is not empty of new work.
- [ ] Do **not** run `db:seed:tickets` in production (it adds 100 fake tickets; it refuses only when `NODE_ENV=production`, which is not set on your machine).

## 6. Email intake

- [ ] Webhook: POST JSON to `https://<domain>/api/webhooks/inbound-email` with header `x-webhook-secret: <INBOUND_EMAIL_SECRET>`.
- [ ] IMAP: the cron job runs daily at 08:00 UTC on Hobby. For polling every few minutes, either move to Pro and change the schedule to `*/5 * * * *`, or call `GET /api/cron/poll-inbox` with `Authorization: Bearer <CRON_SECRET>` from an external scheduler.

## 7. Smoke test after each deploy

- [ ] `https://<domain>/api/health` returns `{"status":"ok"}`.
- [ ] Home page loads signed out: **Sign in** and **Book a demo** show, no Dashboard or Tickets links, the WhatsApp button opens WhatsApp.
- [ ] Sign in as the admin and land on `/dashboard`. Sign out and land on the home page, still signed out after a refresh.
- [ ] Create an agent on the Users page, sign in as that agent, check the "My tickets" and "All tickets" views on `/tickets` and `/dashboard`.
- [ ] Send a test email (webhook or mailbox) and confirm a ticket appears, is classified, and is assigned to the AI agent.
- [ ] Send a reply from a ticket and confirm it is emailed (use a real address you own).

## 8. Custom domain (optional)

- [ ] Settings → Domains → add the domain.
- [ ] Update `BETTER_AUTH_URL` and `CLIENT_URL` to the new origin and redeploy. Sign-in rejects any origin that is not `CLIENT_URL`.

## 9. Rollback and risks

- **Rollback:** Vercel's instant rollback reverts code, not the database. Migrations from this session (`ticket_stats_assignee`) drop and recreate the `ticket_stats` function, so a rollback to older code would call the old one-argument function and fail. Roll back only to a deployment that includes migration `20261023120000`, or restore the function by hand.
- **Preview deployments** get their own URL, so Production's `BETTER_AUTH_URL` does not match them. Sign in on production only, or give previews their own values and database.
- **Stale or leaked secrets:** if anything fails to sign in after a domain change, check `CLIENT_URL` first.
- **Assignee filter is a default view, not access control.** Agents can still switch to "All tickets" and open any ticket by link. Decide before launch whether that is acceptable.

## Order of work

1 → 2 → 3 → 4 → first deploy → set the URL variables → redeploy → 5 → 6 → 7. Steps 8 and 9 are afterwards.
