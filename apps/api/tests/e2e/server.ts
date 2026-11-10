// The API the end-to-end suite (apps/e2e) runs the app against: the real one,
// on its own database, with what lies outside it faked as the integration
// tests fake it. No email leaves, Google is a stand-in and nothing reaches
// Sentry, so a run never touches the network.
//
// Each test that needs a user asks it for an account of its own
// (POST /e2e/accounts), so tests don't share state and can run side by side.
// What a product's tests start from (its own data, more fakes) is added here.
//
//   make api/e2e-server   started by Playwright, not by hand
import { randomUUID } from 'node:crypto'
import express, { type Request, type Response } from 'express'
import cors from 'cors'
import { settings } from '../../src/settings'
import { Container } from '../../src/di'
import { prisma } from '../../src/infrastructure/persistence/prisma'
import { createRouter } from '../../src/infrastructure/web/routes'
import { errorHandler } from '../../src/infrastructure/web/middleware/error-handler'
import { ErrorReporter } from '../../src/domain/ports/error-reporter'
import { FakeEmailSender } from '../helpers/fake-email-sender'

// What would go to Sentry goes to the output Playwright shows.
const errors: ErrorReporter = {
  report: (error, where) => console.error(`[${where}]`, error),
}

Container.getEmailSender = () => new FakeEmailSender()
// Google's sign-in, as the stand-in for its script hands it over in the browser
// (apps/e2e/tests/fixtures.ts, `googleAs`): a credential "fake-google:<email>"
// is that address's Google account, with its email verified.
Container.getGoogleIdentityVerifier = () => ({
  verify: async (credential: string) => {
    const email = credential.match(/^fake-google:(.+)$/)?.[1]
    if (!email) return null
    return { googleId: `google-${email}`, email, emailVerified: true }
  },
})
Container.getErrorReporter = () => errors

const PASSWORD = 'e2e-password'

// A verified account, ready to sign in.
async function createAccount(): Promise<{ email: string; password: string }> {
  const email = `e2e-${randomUUID()}@example.com`
  await prisma.user.create({
    data: {
      email,
      hash: await Container.getPasswordHasher().hash(PASSWORD),
      emailVerifiedAt: new Date(),
    },
  })
  return { email, password: PASSWORD }
}

// Every run starts from an empty database: every table but Prisma's own.
const tables = await prisma.$queryRaw<{ tablename: string }[]>`
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`
if (tables.length > 0) {
  const names = tables.map(({ tablename }) => `"${tablename}"`).join(', ')
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`,
  )
}

const app = express()
// One proxy hop, as in production (src/index.ts). Each test says its own
// address in X-Forwarded-For, so the rate limits count each test as a visitor
// of its own, not the whole suite as one.
app.set('trust proxy', 1)
app.use(cors({ origin: settings.corsOrigins }))
app.use(express.json())
app.post('/e2e/accounts', async (_: Request, res: Response) => {
  res.status(201).send({ data: await createAccount() })
})
app.use('/', createRouter())
app.use(errorHandler(errors))

app.listen(settings.port, (error?: Error) => {
  if (error) throw error
  console.log(`E2E API listening on port ${settings.port}`)
})
