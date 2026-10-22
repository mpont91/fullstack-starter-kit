import type { App } from 'vue'
import { reportError } from './sentry'

// Every island's Vue app passes through here (`appEntrypoint` in
// astro.config.mjs). Vue catches errors inside components itself and only logs
// them, so they never reach the window's handlers that Sentry listens on.
// Astro requires the default export.
export default (app: App): void => {
  app.config.errorHandler = reportError
}
