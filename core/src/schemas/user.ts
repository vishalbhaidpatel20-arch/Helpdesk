import { z } from 'zod'

// Sign-in limits (Better Auth config); kept loose so existing accounts can still sign in
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128
// Passwords for newly created users must be exactly this long
export const NEW_USER_PASSWORD_LENGTH = 8

export const createUserSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required')
    .pipe(z.email('Enter a valid email address')),
  password: z
    .string()
    .length(NEW_USER_PASSWORD_LENGTH, `Password must be exactly ${NEW_USER_PASSWORD_LENGTH} characters`),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
