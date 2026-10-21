import type { Request, Response } from 'express'
import type { z } from 'zod'

// Validates data against a zod schema. On failure it sends a 400 with the first issue's message
// and returns undefined, so the caller just returns.
function parseWith<T extends z.ZodType>(schema: T, data: unknown, res: Response): z.output<T> | undefined {
  const parsed = schema.safeParse(data)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
    return undefined
  }
  return parsed.data
}

// Validates req.body (see parseWith).
export function parseBody<T extends z.ZodType>(schema: T, req: Request, res: Response) {
  return parseWith(schema, req.body, res)
}

// Validates req.query (see parseWith); use the schema's coerce/default to turn query strings into typed values.
export function parseQuery<T extends z.ZodType>(schema: T, req: Request, res: Response) {
  return parseWith(schema, req.query, res)
}
