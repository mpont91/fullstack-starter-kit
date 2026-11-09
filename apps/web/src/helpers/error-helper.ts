import { ApiError } from '../services/api-error'

export interface ErrorMessages {
  // A 5xx, a network failure or a response that didn't match: on us.
  server: string
  // Any other 4xx: the user's input was refused.
  rejected?: string
  // A status with a precise meaning: 409 duplicate, 429 too many tries…
  byStatus?: Partial<Record<number, string>>
}

// A check the form makes before sending anything: its message is told as it
// is.
export class InvalidInput extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidInput'
  }
}

// What to tell the user about a failed request, by whose fault it is.
export function errorMessage(error: unknown, messages: ErrorMessages): string {
  if (error instanceof InvalidInput) return error.message
  const status = error instanceof ApiError ? error.status : 0
  const named = messages.byStatus?.[status]
  if (named) return named
  if (status >= 400 && status < 500 && messages.rejected) {
    return messages.rejected
  }
  return messages.server
}

export const isNotFound = (error: unknown) =>
  error instanceof ApiError && error.status === 404
