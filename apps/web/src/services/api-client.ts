import type { ZodType } from 'zod'
import { clearSession, getToken } from './session'
import { languageFromPath, localizePath } from '../helpers/locale-helper'

const BASE_URL = import.meta.env.PUBLIC_API_URL.replace(/\/+$/, '')

function redirectToLogin(): void {
  clearSession()
  if (typeof location === 'undefined') return
  // Reading the language off the URL is safe here: this only ever runs in the
  // browser, in response to a request the page already made.
  const login = localizePath('/login', languageFromPath(location.pathname))
  if (location.pathname === login) return
  const redirect = encodeURIComponent(location.pathname + location.search)
  location.replace(`${login}?redirect=${redirect}`)
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  auth?: boolean
}

export async function apiRequest<T>(
  path: string,
  schema: ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, auth = false } = options

  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const payload = await response.json().catch(() => null)

  if (response.status === 401 && auth) {
    redirectToLogin()
  }

  if (!response.ok) {
    const detail = payload?.details ?? payload?.error
    const message = typeof detail === 'string' ? detail : response.statusText
    throw new ApiError(response.status, message, payload?.details)
  }

  const result = schema.safeParse(payload?.data)
  if (!result.success) {
    throw new ApiError(
      response.status,
      'Unexpected response shape from API',
      result.error.issues,
    )
  }

  return result.data
}
