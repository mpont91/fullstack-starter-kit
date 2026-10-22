// Client-side session storage. The backend issues a stateless JWT, so the
// browser is responsible for keeping the bearer token (and the user it belongs
// to) around. Everything here is a thin, framework-agnostic wrapper over
// localStorage so it can be used from both Vue islands and inline scripts.

import { STORAGE_PREFIX, type User } from '@app/shared'

export type { User }

const TOKEN_KEY = `${STORAGE_PREFIX}.token`
const USER_KEY = `${STORAGE_PREFIX}.user`

export function getToken(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getUser(): User | null {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem(USER_KEY)
  return raw ? (JSON.parse(raw) as User) : null
}

export function isAuthenticated(): boolean {
  return getToken() !== null
}

export function setSession(token: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

// Refresh the stored user without touching the token (e.g. after `/auth/me`).
export function setUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
