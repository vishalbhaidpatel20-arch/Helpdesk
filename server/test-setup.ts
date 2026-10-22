// Preloaded by `bun test` (see bunfig.toml). Bun loads server/.env automatically, which holds the real mailbox
// credentials, so unit tests must never see them: otherwise a test that reaches the mail code could send real email (or report to the real Sentry project).
for (const key of ['IMAP_USER', 'IMAP_PASSWORD', 'MAIL_USER', 'MAIL_PASSWORD', 'SMTP_PASSWORD', 'SMTP_DOMAIN', 'SENTRY_DSN']) {
  delete process.env[key]
}
