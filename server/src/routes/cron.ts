import { createHash, timingSafeEqual } from 'node:crypto'
import { Router } from 'express'
import { pollInbox, readImapConfig } from '../lib/imapPoller'

export const cronRouter = Router()

// Hash both sides so the comparison is constant-time even when the lengths differ
function secretMatches(provided: string | undefined, expected: string) {
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(provided ?? ''), digest(expected))
}

// Vercel has no process that stays alive to poll the mailbox, so a Vercel Cron job (or any scheduler) calls this
// instead. Vercel sends "Authorization: Bearer <CRON_SECRET>" when the CRON_SECRET env var is set.
cronRouter.get('/poll-inbox', async (req, res) => {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    res.status(503).json({ error: 'Cron is not configured' })
    return
  }
  if (!secretMatches(req.get('authorization'), `Bearer ${secret}`)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const config = readImapConfig()
  if (!config) {
    res.json({ skipped: 'IMAP is not configured' })
    return
  }
  res.json({ processed: await pollInbox(config) })
})
