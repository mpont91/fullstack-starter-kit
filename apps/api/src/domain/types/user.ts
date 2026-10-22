import { z } from 'zod'
import { roleSchema, userLanguageSchema } from '@app/shared'

// The persisted row. What the API exposes is `User` in @app/shared; the mapper
// in mappers/user-mapper.ts drops the secrets and serialises the dates.
export const userRecordSchema = z.object({
  id: z.string(),
  email: z.string(),
  language: userLanguageSchema,
  role: roleSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  hash: z.string().nullable(),
  googleId: z.string().nullable(),
  sessionsValidFrom: z.date().nullable(),
  emailVerifiedAt: z.date().nullable(),
  verificationTokenHash: z.string().nullable(),
  verificationExpiresAt: z.date().nullable(),
})

export type UserRecord = z.infer<typeof userRecordSchema>
