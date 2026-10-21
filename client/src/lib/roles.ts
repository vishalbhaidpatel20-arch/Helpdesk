// The only place the client defines role values; never write 'ADMIN' / 'AGENT' literals elsewhere.
// Mirrors the Prisma `Role` enum (server/prisma/schema.prisma); the client can't import server/generated
export const Role = { ADMIN: 'ADMIN', AGENT: 'AGENT' } as const
export type Role = (typeof Role)[keyof typeof Role]
