import { tmpdir } from 'node:os'
import { join } from 'node:path'
import express, { type Express, Router } from 'express'
import cors from 'cors'
import { APP_NAME, APP_SLUG } from '@app/shared'
import { settings } from './settings'
import { initSentry } from './infrastructure/monitoring/sentry-error-reporter'
import { HeapWatchdog } from './infrastructure/monitoring/heap-watchdog'
import { RunMarker } from './infrastructure/monitoring/run-marker'
import { errorHandler } from './infrastructure/web/middleware/error-handler'
import { createRouter } from './infrastructure/web/routes'
import { Container } from './di'

// First, so that an error anywhere after this, including one that kills the
// process, is reported.
initSentry(settings.monitoring)

const errorReporter = Container.getErrorReporter()

const router: Router = createRouter()

const app: Express = express()

// In production the API sits behind one reverse proxy (its port is bound to
// 127.0.0.1). Trusting that one hop makes `request.ip` the visitor's address,
// so the login rate limit counts per visitor, not for everyone at once.
app.set('trust proxy', 1)

app.use(cors({ origin: settings.corsOrigins }))

app.use(express.json({ limit: '1mb' }))
app.use('/', router)
app.use(errorHandler(errorReporter))

// By port, so two APIs on one machine (development) don't take each other's
// mark for a crash.
const runMarker = new RunMarker(
  join(tmpdir(), `${APP_SLUG}-api-${settings.port}.running`),
  errorReporter,
)

app.listen(settings.port, (): void => {
  console.log(`${APP_NAME} API listening on port ${settings.port}`)
  runMarker.start()
  new HeapWatchdog(errorReporter).start()
})

// A clean exit removes the run marker, so the next boot knows this one didn't
// crash. A background worker added later stops here too, letting the job in
// flight finish.
const shutdown = (): void => {
  runMarker.stop()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
