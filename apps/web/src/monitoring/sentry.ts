import * as Sentry from '@sentry/browser'
import { scrubEvent } from './scrub-event'

// Without a DSN (development) the SDK is a no-op and errors only reach the
// console.
export const initSentry = (): void => {
  Sentry.init({
    dsn: import.meta.env.PUBLIC_SENTRY_DSN || undefined,
    environment: import.meta.env.MODE,
    beforeSend: scrubEvent,
  })
}

export const reportError = (error: unknown): void => {
  console.error(error)
  Sentry.captureException(error)
}
