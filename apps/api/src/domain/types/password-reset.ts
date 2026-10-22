import { z } from 'zod'

export const passwordResetTokenRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tokenHash: z.string(),
  expiresAt: z.date(),
  usedAt: z.date().nullable(),
  createdAt: z.date(),
})

export type PasswordResetTokenRecord = z.infer<
  typeof passwordResetTokenRecordSchema
>
