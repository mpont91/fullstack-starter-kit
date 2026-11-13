import * as Sentry from '@sentry/browser'
import { PUBLIC_SENTRY_DSN } from 'astro:env/client'
import { scrubEvent } from './scrub-event'

// Without a DSN (development) the SDK is a no-op and errors only reach the
// console.
export const initSentry = (): void => {
  Sentry.init({
    dsn: PUBLIC_SENTRY_DSN,
    environment: import.meta.env.MODE,
    beforeSend: scrubEvent,
  })
}

export const reportError = (error: unknown): void => {
  console.error(error)
  Sentry.captureException(error)
}
