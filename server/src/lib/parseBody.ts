import type { Request, Response } from 'express'
import type { z } from 'zod'

// Validates req.body against a zod schema. On failure it sends a 400 with the first issue's message
// and returns undefined, so the caller just returns.
export function parseBody<T extends z.ZodType>(
  schema: T,
  req: Request,
  res: Response,
): z.output<T> | undefined {
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
    return undefined
  }
  return parsed.data
}
