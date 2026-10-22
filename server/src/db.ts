import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/client'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  // Every function instance has its own pool; keep it tiny so many instances cannot exhaust the database
  // (use the provider's pooled connection string on Vercel)
  max: process.env.VERCEL ? 1 : undefined,
})

export const prisma = new PrismaClient({ adapter })
