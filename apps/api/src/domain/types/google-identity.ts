import { z } from 'zod'

// What the API keeps from a verified Google ID token: the account id and the
// email, and whether Google has verified that email. No name, no picture.
export const googleIdentitySchema = z.object({
  googleId: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
})

export type GoogleIdentity = z.infer<typeof googleIdentitySchema>
