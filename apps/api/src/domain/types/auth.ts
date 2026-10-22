import { z } from 'zod'

export const tokenPayloadSchema = z.object({
  userId: z.string(),
})

// What a valid token carries beyond what was signed: its own id, so a logout
// can revoke this one session, and its expiry, so the revocation can be
// forgotten once the token would have died anyway.
export const verifiedTokenSchema = tokenPayloadSchema.extend({
  jti: z.string(),
  iat: z.number(),
  exp: z.number(),
})

export type TokenPayload = z.infer<typeof tokenPayloadSchema>
export type VerifiedToken = z.infer<typeof verifiedTokenSchema>
