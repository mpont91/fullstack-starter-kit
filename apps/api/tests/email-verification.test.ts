import { after, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { authResponseSchema } from '@app/shared'
import { PrismaUserRepository } from '../src/infrastructure/persistence/prisma-user-repository'
import { PrismaPasswordResetTokenRepository } from '../src/infrastructure/persistence/prisma-password-reset-token-repository'
import { BcryptPasswordHasher } from '../src/infrastructure/auth/bcrypt-password-hasher'
import { JwtTokenService } from '../src/infrastructure/auth/jwt-token-service'
import { CryptoOneTimeTokenService } from '../src/infrastructure/auth/crypto-one-time-token-service'
import { VerificationEmailService } from '../src/application/verification-email-service'
import { RegisterUseCase } from '../src/application/register-use-case'
import { LoginUseCase } from '../src/application/login-use-case'
import { VerifyEmailUseCase } from '../src/application/verify-email-use-case'
import { ResendVerificationUseCase } from '../src/application/resend-verification-use-case'
import { RequestPasswordResetUseCase } from '../src/application/request-password-reset-use-case'
import { ResetPasswordUseCase } from '../src/application/reset-password-use-case'
import {
  EmailNotVerifiedError,
  InvalidOrExpiredVerificationTokenError,
} from '../src/domain/errors/auth-error'
import { FakeEmailSender } from './helpers/fake-email-sender'
import { FakeErrorReporter } from './helpers/fake-error-reporter'
import { prisma, resetDatabase } from './helpers/test-database'

const users = new PrismaUserRepository(prisma)
// Low rounds: these tests are about the verification flow, not bcrypt.
const hasher = new BcryptPasswordHasher(4)
const tokens = new JwtTokenService('test-secret', '1h')
const oneTimeTokens = new CryptoOneTimeTokenService()

let emails: FakeEmailSender
let register: RegisterUseCase
let login: LoginUseCase
let verifyEmail: VerifyEmailUseCase
let resend: ResendVerificationUseCase
let requestReset: RequestPasswordResetUseCase
let resetPassword: ResetPasswordUseCase

beforeEach(async () => {
  await resetDatabase()
  emails = new FakeEmailSender()
  const verificationEmail = new VerificationEmailService(
    users,
    oneTimeTokens,
    emails,
    'https://app.test',
  )
  register = new RegisterUseCase(
    users,
    hasher,
    verificationEmail,
    new FakeErrorReporter(),
  )
  login = new LoginUseCase(users, hasher, tokens)
  verifyEmail = new VerifyEmailUseCase(users, oneTimeTokens, tokens)
  resend = new ResendVerificationUseCase(users, verificationEmail)
  const resetTokens = new PrismaPasswordResetTokenRepository(prisma)
  requestReset = new RequestPasswordResetUseCase(
    users,
    resetTokens,
    oneTimeTokens,
    emails,
    'https://app.test',
  )
  resetPassword = new ResetPasswordUseCase(
    users,
    resetTokens,
    oneTimeTokens,
    hasher,
    tokens,
  )
})

after(() => prisma.$disconnect())

const alice = { email: 'alice@example.com', password: 'secret123' }

describe('verifying the email', () => {
  it('registers without a session and sends the confirmation link', async () => {
    const result = await register.execute({ ...alice, language: 'ES' })

    assert.deepEqual(result, { email: alice.email })
    assert.equal(emails.welcomes.length, 1)
    assert.equal(emails.welcomes[0].language, 'ES')
    assert.match(
      emails.welcomes[0].url,
      /^https:\/\/app\.test\/verify-email\?token=/,
    )
  })

  it('registers even if the email fails, and reports the failure', async () => {
    const errorReporter = new FakeErrorReporter()
    const failingEmail = new FakeEmailSender()
    failingEmail.sendWelcome = async () => {
      throw new Error('provider down')
    }
    const registerWithoutEmail = new RegisterUseCase(
      users,
      hasher,
      new VerificationEmailService(
        users,
        oneTimeTokens,
        failingEmail,
        'https://app.test',
      ),
      errorReporter,
    )

    const result = await registerWithoutEmail.execute({
      ...alice,
      language: 'EN',
    })

    assert.deepEqual(result, { email: alice.email })
    assert.equal(errorReporter.reports.length, 1)
    const [report] = errorReporter.reports
    assert.equal(report.where, 'welcome-email')
    // The id, never the address.
    assert.equal(report.userId, (await users.findByEmail(alice.email))?.id)
    assert.equal((report.error as Error).message, 'provider down')
  })

  it('refuses to log in until the link is clicked', async () => {
    await register.execute({ ...alice, language: 'EN' })

    await assert.rejects(() => login.execute(alice), EmailNotVerifiedError)
  })

  it('logs the user in from the link, and lets them log in afterwards', async () => {
    await register.execute({ ...alice, language: 'EN' })

    const session = await verifyEmail.execute(emails.lastWelcomeToken())

    authResponseSchema.parse(session)
    assert.equal(session.user.email, alice.email)
    assert.equal(tokens.verify(session.token).userId, session.user.id)
    assert.equal((await login.execute(alice)).user.email, alice.email)
  })

  it('accepts a link only once', async () => {
    await register.execute({ ...alice, language: 'EN' })
    const token = emails.lastWelcomeToken()
    await verifyEmail.execute(token)

    await assert.rejects(
      () => verifyEmail.execute(token),
      InvalidOrExpiredVerificationTokenError,
    )
  })

  it('refuses an expired link', async () => {
    await register.execute({ ...alice, language: 'EN' })
    await prisma.user.updateMany({
      data: { verificationExpiresAt: new Date(Date.now() - 1000) },
    })

    await assert.rejects(
      () => verifyEmail.execute(emails.lastWelcomeToken()),
      InvalidOrExpiredVerificationTokenError,
    )
  })

  it('resending replaces the previous link', async () => {
    await register.execute({ ...alice, language: 'EN' })
    const first = emails.lastWelcomeToken()
    // Past the cooldown, as if the first email was sent two minutes ago.
    await prisma.user.updateMany({
      data: {
        verificationExpiresAt: new Date(
          Date.now() + 24 * 60 * 60 * 1000 - 2 * 60 * 1000,
        ),
      },
    })

    await resend.execute(alice.email)

    assert.equal(emails.welcomes.length, 2)
    await assert.rejects(
      () => verifyEmail.execute(first),
      InvalidOrExpiredVerificationTokenError,
    )
    await verifyEmail.execute(emails.lastWelcomeToken())
  })

  it('stays silent for unknown, verified or just-sent addresses', async () => {
    await register.execute({ ...alice, language: 'EN' })

    await resend.execute(alice.email) // within the cooldown
    await resend.execute('nobody@example.com')
    await verifyEmail.execute(emails.lastWelcomeToken())
    await resend.execute(alice.email) // already verified

    assert.equal(emails.welcomes.length, 1)
  })

  it('counts a password reset as proof of the address', async () => {
    await register.execute({ ...alice, language: 'EN' })
    await requestReset.execute(alice.email)
    const resetToken = new URL(emails.resets[0].url).searchParams.get('token')!

    await resetPassword.execute({ token: resetToken, password: 'another-one' })

    const session = await login.execute({
      email: alice.email,
      password: 'another-one',
    })
    assert.equal(session.user.email, alice.email)
  })
})
