import { z } from 'zod'
import { isoDateSchema } from './dates.js'

// The language a user reads emails in. Not the web's UI locale (`en`/`es`),
// which comes from the URL.
export const userLanguageSchema = z.enum(['EN', 'ES'])

export const roleSchema = z.enum(['USER', 'ADMIN'])

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  language: userLanguageSchema,
  role: roleSchema,
  // False for an account created with Google that never set a password: the
  // web confirms its sensitive actions with Google instead.
  hasPassword: z.boolean(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
})

export type UserLanguage = z.infer<typeof userLanguageSchema>
export type Role = z.infer<typeof roleSchema>
export type User = z.infer<typeof userSchema>
