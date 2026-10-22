import { z } from 'zod'
import { userLanguageSchema, userSchema } from './user.js'

// The web checks it before submitting, to save a round trip on a typo.
export const PASSWORD_MIN_LENGTH = 8

export const registerRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(PASSWORD_MIN_LENGTH),
  language: userLanguageSchema.default('EN'),
})

export const loginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

// The ID token Google Identity Services hands the web. The API verifies it; the
// language is only used if the sign-in creates the account.
export const googleSignInRequestSchema = z.object({
  credential: z.string().min(1),
  language: userLanguageSchema.default('EN'),
})

export const updateLanguageRequestSchema = z.object({
  language: userLanguageSchema,
})

// Confirmed with the password, or, for an account without one, by signing in
// with Google again.
export const deleteAccountRequestSchema = z.union([
  z.object({ password: z.string().min(1) }),
  z.object({ googleCredential: z.string().min(1) }),
])

export const verifyEmailRequestSchema = z.object({
  token: z.string().min(1),
})

export const resendVerificationRequestSchema = z.object({
  email: z.email(),
})

export const requestPasswordResetRequestSchema = z.object({
  email: z.email(),
})

export const resetPasswordRequestSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(PASSWORD_MIN_LENGTH),
})

export const changePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH),
})

export const registerResponseSchema = z.object({
  email: z.string(),
})

export const authResponseSchema = z.object({
  token: z.string(),
  user: userSchema,
})

export const passwordResetEmailSchema = z.object({
  email: z.string(),
})

// Endpoints with nothing to return but a confirmation.
export const messageSchema = z.object({
  message: z.string(),
})

export type RegisterRequest = z.infer<typeof registerRequestSchema>
export type LoginRequest = z.infer<typeof loginRequestSchema>
export type GoogleSignInRequest = z.infer<typeof googleSignInRequestSchema>
export type UpdateLanguageRequest = z.infer<typeof updateLanguageRequestSchema>
export type DeleteAccountRequest = z.infer<typeof deleteAccountRequestSchema>
export type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>
export type ResendVerificationRequest = z.infer<
  typeof resendVerificationRequestSchema
>
export type RequestPasswordResetRequest = z.infer<
  typeof requestPasswordResetRequestSchema
>
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>
export type ChangePasswordRequest = z.infer<typeof changePasswordRequestSchema>
export type RegisterResponse = z.infer<typeof registerResponseSchema>
export type AuthResponse = z.infer<typeof authResponseSchema>
export type PasswordResetEmail = z.infer<typeof passwordResetEmailSchema>
export type Message = z.infer<typeof messageSchema>
