// Authentication service. Talks to the API's /auth endpoints and keeps the
// session in sync. UI code should import session getters from here too, so the
// service is the single entry point for everything auth-related.

import {
  authResponseSchema,
  messageSchema,
  passwordResetEmailSchema,
  registerResponseSchema,
  userSchema,
} from '@app/shared'
import { apiRequest } from './api-client'
import { clearSession, setSession, setUser, type User } from './session'
import { apiLanguageFromSite } from '../helpers/locale-helper'
import type { Language } from '../i18n'

export async function login(email: string, password: string): Promise<User> {
  const { token, user } = await apiRequest('/auth/login', authResponseSchema, {
    method: 'POST',
    body: { email, password },
  })
  setSession(token, user)
  return user
}

// Logs in, links or registers, whichever the API finds applies: the language is
// only used if this creates the account. Google has already verified the
// address, so there's no confirmation email.
export async function signInWithGoogle(
  credential: string,
  language: Language,
): Promise<User> {
  const { token, user } = await apiRequest('/auth/google', authResponseSchema, {
    method: 'POST',
    body: { credential, language: apiLanguageFromSite(language) },
  })
  setSession(token, user)
  return user
}

// Registering doesn't log in: the API sends a welcome email whose link
// confirms the address, and only that link (see `verifyEmail`) opens a
// session. Resolves with the email the link went to.
export async function register(
  email: string,
  password: string,
  language: Language,
): Promise<string> {
  const result = await apiRequest('/auth/register', registerResponseSchema, {
    method: 'POST',
    body: { email, password, language: apiLanguageFromSite(language) },
  })
  return result.email
}

export async function verifyEmail(token: string): Promise<User> {
  const { token: authToken, user } = await apiRequest(
    '/auth/verify-email',
    authResponseSchema,
    { method: 'POST', body: { token } },
  )
  setSession(authToken, user)
  return user
}

// Always resolves the same way, like `requestPasswordReset`: the API won't say
// whether the address exists or was already confirmed.
export async function resendVerification(email: string): Promise<void> {
  await apiRequest('/auth/verify-email/resend', messageSchema, {
    method: 'POST',
    body: { email },
  })
}

// Persists a language change for the logged-in user and refreshes the
// session's stored copy so it stays in sync with the backend.
export async function updateLanguage(language: Language): Promise<User> {
  const user = await apiRequest('/auth/me', userSchema, {
    method: 'PATCH',
    auth: true,
    body: { language: apiLanguageFromSite(language) },
  })
  setUser(user)
  return user
}

// Fetches the current user with the stored bearer and refreshes the session.
// Useful to validate the token on load.
export async function me(): Promise<User> {
  const user = await apiRequest('/auth/me', userSchema, { auth: true })
  setUser(user)
  return user
}

// Always resolves, even for an unknown email: the API deliberately answers
// the same way either way so this can't be used to probe registered emails.
export async function requestPasswordReset(email: string): Promise<void> {
  await apiRequest('/auth/password-reset/request', messageSchema, {
    method: 'POST',
    body: { email },
  })
}

// Looks up which account a reset link belongs to, so the reset form can show
// the email being changed instead of asking the user to trust a bare token.
export async function getPasswordResetEmail(token: string): Promise<string> {
  const { email } = await apiRequest(
    `/auth/password-reset/${encodeURIComponent(token)}`,
    passwordResetEmailSchema,
  )
  return email
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<User> {
  const { token: authToken, user } = await apiRequest(
    '/auth/password-reset/confirm',
    authResponseSchema,
    { method: 'POST', body: { token, password } },
  )
  setSession(authToken, user)
  return user
}

// Asks for the password again on the API side, or a fresh Google sign-in for
// an account without one; a wrong one comes back as a 403, not a 401, so the
// session survives a typo.
export async function deleteAccount(
  confirmation: { password: string } | { googleCredential: string },
): Promise<void> {
  await apiRequest('/auth/me', messageSchema, {
    method: 'DELETE',
    auth: true,
    body: confirmation,
  })
  clearSession()
}

// Changing the password ends every session on the API, this one included, so
// the response carries a fresh token that replaces the stored one.
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const { token, user } = await apiRequest(
    '/auth/password',
    authResponseSchema,
    {
      method: 'PUT',
      auth: true,
      body: { currentPassword, newPassword },
    },
  )
  setSession(token, user)
}

// Ends the session on the API too, so the token stops working even if it was
// copied somewhere. The local session is cleared whatever the API says: a
// user who clicked "log out" must end up logged out.
export async function logout(): Promise<void> {
  try {
    await apiRequest('/auth/logout', messageSchema, {
      method: 'POST',
      auth: true,
    })
  } catch {
    // Already expired or revoked, or the API is down — nothing left to end.
  } finally {
    clearSession()
  }
}

export { getUser, getToken, isAuthenticated, type User } from './session'
