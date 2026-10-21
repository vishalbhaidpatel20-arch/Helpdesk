import { z } from 'zod'

// Sign-in limits (Better Auth config); kept loose so existing accounts can still sign in
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128
// Passwords for newly created users must be exactly this long
export const NEW_USER_PASSWORD_LENGTH = 8

const nameSchema = z.string().trim().min(3, 'Name must be at least 3 characters')

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .pipe(z.email('Enter a valid email address'))

const passwordSchema = z
  .string()
  .length(NEW_USER_PASSWORD_LENGTH, `Password must be exactly ${NEW_USER_PASSWORD_LENGTH} characters`)

export const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
})

export type CreateUserInput = z.infer<typeof createUserSchema>

// The password is optional when editing: empty or missing means "keep the current password"
export const updateUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: z.union([z.literal(''), passwordSchema]).optional(),
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>
