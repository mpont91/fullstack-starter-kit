import * as Sentry from '@sentry/node'
import { ErrorReporter } from '../../domain/ports/error-reporter'
import { MonitoringSettings } from '../../domain/types/settings'

// Without a DSN (development, tests) the SDK is a no-op and errors only reach
// the console.
export const initSentry = (settings: MonitoringSettings): void => {
  Sentry.init({
    dsn: settings.sentryDsn,
    environment: settings.environment,
    beforeSend: scrubEvent,
  })
}

// The last gate before an event leaves the server. Breadcrumbs go because they
// carry console lines and outgoing URLs; the request keeps its method and path
// but loses headers (the bearer token), body (user data, emails) and query;
// the user keeps only their id.
export const scrubEvent = (event: Sentry.ErrorEvent): Sentry.ErrorEvent => {
  const { request, user } = event
  const scrubbed = { ...event }
  delete scrubbed.breadcrumbs
  delete scrubbed.request
  delete scrubbed.user
  if (request) {
    scrubbed.request = {
      method: request.method,
      url: request.url?.split('?')[0],
    }
  }
  if (user?.id !== undefined) {
    scrubbed.user = { id: user.id }
  }
  return scrubbed
}

export class SentryErrorReporter implements ErrorReporter {
  report(error: unknown, where: string, userId?: string): void {
    console.error(`[${where}]`, error)
    Sentry.captureException(error, {
      tags: { where },
      ...(userId && { user: { id: userId } }),
    })
  }
}
