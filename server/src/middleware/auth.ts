import { fromNodeHeaders } from 'better-auth/node'
import type { NextFunction, Request, Response } from 'express'
import { Role } from '../../generated/enums'
import { auth } from '../auth'

export type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

// Rejects requests without a valid session (401) and exposes it as res.locals.session
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) })
  if (!session) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  res.locals.session = session
  next()
}

// Use after requireAuth: rejects non-admins (403)
export function requireAdmin(_req: Request, res: Response, next: NextFunction) {
  const session = res.locals.session as Session | undefined
  if (session?.user.role !== Role.ADMIN) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  next()
}
