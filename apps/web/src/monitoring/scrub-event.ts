import type { ErrorEvent } from '@sentry/browser'

// The last gate before an event leaves the browser. Breadcrumbs go because they
// carry console lines, clicked text and fetched URLs; the page's URL loses its
// query and fragment (the email links carry their token there) and the request
// its headers (the referrer can carry one too); the user keeps only their id.
export const scrubEvent = (event: ErrorEvent): ErrorEvent => {
  const { request, user } = event
  const scrubbed = { ...event }
  delete scrubbed.breadcrumbs
  delete scrubbed.request
  delete scrubbed.user
  if (request?.url) {
    scrubbed.request = { url: request.url.split(/[?#]/)[0] }
  }
  if (user?.id !== undefined) {
    scrubbed.user = { id: user.id }
  }
  return scrubbed
}
