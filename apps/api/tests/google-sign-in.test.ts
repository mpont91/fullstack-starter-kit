import { after, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { authResponseSchema } from '@app/shared'
import { PrismaUserRepository } from '../src/infrastructure/persistence/prisma-user-repository'
import { BcryptPasswordHasher } from '../src/infrastructure/auth/bcrypt-password-hasher'
import { JwtTokenService } from '../src/infrastructure/auth/jwt-token-service'
import { GoogleSignInUseCase } from '../src/application/google-sign-in-use-case'
import { LoginUseCase } from '../src/application/login-use-case'
import { InvalidCredentialsError } from '../src/domain/errors/auth-error'
import { FakeGoogleIdentityVerifier } from './helpers/fake-google-identity-verifier'
import { prisma, resetDatabase } from './helpers/test-database'

const users = new PrismaUserRepository(prisma)
// Low rounds: these tests are about accounts, not bcrypt.
const hasher = new BcryptPasswordHasher(4)
const tokens = new JwtTokenService('test-secret', '1h')
const google = new FakeGoogleIdentityVerifier()
const signIn = new GoogleSignInUseCase(users, google, tokens)
const login = new LoginUseCase(users, hasher, tokens)

function alicesGoogle(emailVerified = true): string {
  return google.issue({
    googleId: 'g-alice',
    email: 'alice@example.com',
    emailVerified,
  })
}

async function registerWithPassword(verified: boolean): Promise<string> {
  const user = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      hash: await hasher.hash('secret-password'),
      emailVerifiedAt: verified ? new Date() : null,
    },
  })
  return user.id
}

beforeEach(resetDatabase)

after(() => prisma.$disconnect())

describe('signing in with Google', () => {
  it('creates a confirmed account, without a password, in the page language', async () => {
    const result = await signIn.execute({
      credential: alicesGoogle(),
      language: 'ES',
    })

    authResponseSchema.parse(result)
    assert.equal(result.user.email, 'alice@example.com')
    assert.equal(result.user.language, 'ES')
    assert.equal(result.user.hasPassword, false)
    const stored = await prisma.user.findUniqueOrThrow({
      where: { id: result.user.id },
    })
    assert.equal(stored.googleId, 'g-alice')
    assert.equal(stored.hash, null)
    assert.ok(stored.emailVerifiedAt)
  })

  it('opens the same account on the next sign-in', async () => {
    const first = await signIn.execute({
      credential: alicesGoogle(),
      language: 'EN',
    })
    const second = await signIn.execute({
      credential: alicesGoogle(),
      language: 'ES',
    })

    assert.equal(second.user.id, first.user.id)
    // The language only applies when the account is created.
    assert.equal(second.user.language, 'EN')
    assert.equal(await prisma.user.count(), 1)
  })

  it('opens an existing email and password account, and both ways work', async () => {
    const alice = await registerWithPassword(true)

    const result = await signIn.execute({
      credential: alicesGoogle(),
      language: 'EN',
    })

    assert.equal(result.user.id, alice)
    assert.equal(result.user.hasPassword, true)
    assert.equal(await prisma.user.count(), 1)
    const viaPassword = await login.execute({
      email: 'alice@example.com',
      password: 'secret-password',
    })
    assert.equal(viaPassword.user.id, alice)
  })

  it('drops the password of an account whose email was never confirmed', async () => {
    // Someone may have registered Alice's address first, hoping to get in
    // once she uses it: her signing in with Google mustn't let them.
    const squatted = await registerWithPassword(false)

    const result = await signIn.execute({
      credential: alicesGoogle(),
      language: 'EN',
    })

    assert.equal(result.user.id, squatted)
    assert.equal(result.user.hasPassword, false)
    const stored = await prisma.user.findUniqueOrThrow({
      where: { id: squatted },
    })
    assert.ok(stored.emailVerifiedAt)
    assert.equal(stored.verificationTokenHash, null)
    await assert.rejects(
      () =>
        login.execute({
          email: 'alice@example.com',
          password: 'secret-password',
        }),
      InvalidCredentialsError,
    )
  })

  it('refuses an address Google has not verified, and links nothing', async () => {
    const alice = await registerWithPassword(true)

    await assert.rejects(
      () => signIn.execute({ credential: alicesGoogle(false), language: 'EN' }),
      InvalidCredentialsError,
    )
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: alice } })
    assert.equal(stored.googleId, null)
  })

  it('refuses a token Google did not issue', async () => {
    await assert.rejects(
      () => signIn.execute({ credential: 'forged', language: 'EN' }),
      InvalidCredentialsError,
    )
    assert.equal(await prisma.user.count(), 0)
  })
})
