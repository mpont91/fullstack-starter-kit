import { after, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { authResponseSchema } from '@app/shared'
import { PrismaUserRepository } from '../src/infrastructure/persistence/prisma-user-repository'
import { PrismaPasswordResetTokenRepository } from '../src/infrastructure/persistence/prisma-password-reset-token-repository'
import { PrismaRevokedTokenRepository } from '../src/infrastructure/persistence/prisma-revoked-token-repository'
import { BcryptPasswordHasher } from '../src/infrastructure/auth/bcrypt-password-hasher'
import { JwtTokenService } from '../src/infrastructure/auth/jwt-token-service'
import { CryptoOneTimeTokenService } from '../src/infrastructure/auth/crypto-one-time-token-service'
import { RequestPasswordResetUseCase } from '../src/application/request-password-reset-use-case'
import { ResetPasswordUseCase } from '../src/application/reset-password-use-case'
import { GetPasswordResetEmailUseCase } from '../src/application/get-password-reset-email-use-case'
import { LoginUseCase } from '../src/application/login-use-case'
import { AuthenticateUseCase } from '../src/application/authenticate-use-case'
import {
  InvalidCredentialsError,
  InvalidOrExpiredResetTokenError,
  UnauthorizedError,
} from '../src/domain/errors/auth-error'
import { FakeEmailSender } from './helpers/fake-email-sender'
import { createUser, prisma, resetDatabase } from './helpers/test-database'

const users = new PrismaUserRepository(prisma)
const resetTokens = new PrismaPasswordResetTokenRepository(prisma)
// Low rounds: these tests are about the reset flow, not bcrypt.
const hasher = new BcryptPasswordHasher(4)
const tokens = new JwtTokenService('test-secret', '1h')
const oneTimeTokens = new CryptoOneTimeTokenService()

const resetPassword = new ResetPasswordUseCase(
  users,
  resetTokens,
  oneTimeTokens,
  hasher,
  tokens,
)
const getResetEmail = new GetPasswordResetEmailUseCase(
  users,
  resetTokens,
  oneTimeTokens,
)
const login = new LoginUseCase(users, hasher, tokens)
const authenticate = new AuthenticateUseCase(
  tokens,
  new PrismaRevokedTokenRepository(prisma),
  users,
)

let emails: FakeEmailSender
let requestReset: RequestPasswordResetUseCase

beforeEach(async () => {
  await resetDatabase()
  emails = new FakeEmailSender()
  requestReset = new RequestPasswordResetUseCase(
    users,
    resetTokens,
    oneTimeTokens,
    emails,
    'https://app.test',
  )
})

after(() => prisma.$disconnect())

async function createVerifiedUser(email: string, password: string) {
  const id = await createUser(email)
  await prisma.user.update({
    where: { id },
    data: { hash: await hasher.hash(password), emailVerifiedAt: new Date() },
  })
  return id
}

function lastResetToken(): string {
  const last = emails.resets.at(-1)
  if (!last) throw new Error('No reset email was sent')
  return new URL(last.url).searchParams.get('token')!
}

describe('resetting a password', () => {
  it('emails a link that sets a new password and opens a session', async () => {
    await createVerifiedUser('alice@example.com', 'old-password')

    await requestReset.execute('alice@example.com')
    const token = lastResetToken()
    assert.equal(await getResetEmail.execute(token), 'alice@example.com')

    const session = await resetPassword.execute({
      token,
      password: 'new-password',
    })

    authResponseSchema.parse(session)
    await login.execute({
      email: 'alice@example.com',
      password: 'new-password',
    })
    await assert.rejects(
      () =>
        login.execute({ email: 'alice@example.com', password: 'old-password' }),
      InvalidCredentialsError,
    )
  })

  it('ends the sessions opened before the reset', async () => {
    await createVerifiedUser('alice@example.com', 'old-password')
    const before = await login.execute({
      email: 'alice@example.com',
      password: 'old-password',
    })
    // Sessions are cut at whole seconds; see domain/sessions.ts.
    await new Promise((resolve) => setTimeout(resolve, 1100))

    await requestReset.execute('alice@example.com')
    const after = await resetPassword.execute({
      token: lastResetToken(),
      password: 'new-password',
    })

    await assert.rejects(
      () => authenticate.execute(before.token),
      UnauthorizedError,
    )
    await authenticate.execute(after.token)
  })

  it('accepts a link only once', async () => {
    await createVerifiedUser('alice@example.com', 'old-password')
    await requestReset.execute('alice@example.com')
    const token = lastResetToken()

    await resetPassword.execute({ token, password: 'new-password' })

    await assert.rejects(
      () => resetPassword.execute({ token, password: 'other-password' }),
      InvalidOrExpiredResetTokenError,
    )
    await assert.rejects(
      () => getResetEmail.execute(token),
      InvalidOrExpiredResetTokenError,
    )
  })

  it('refuses an expired link', async () => {
    await createVerifiedUser('alice@example.com', 'old-password')
    await requestReset.execute('alice@example.com')
    await prisma.passwordResetToken.updateMany({
      data: { expiresAt: new Date(Date.now() - 1000) },
    })

    await assert.rejects(
      () =>
        resetPassword.execute({
          token: lastResetToken(),
          password: 'new-password',
        }),
      InvalidOrExpiredResetTokenError,
    )
  })

  it('stays silent for an unknown address', async () => {
    await requestReset.execute('nobody@example.com')

    assert.equal(emails.resets.length, 0)
  })
})
