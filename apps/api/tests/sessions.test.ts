import { after, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import { JwtTokenService } from '../src/infrastructure/auth/jwt-token-service'
import { BcryptPasswordHasher } from '../src/infrastructure/auth/bcrypt-password-hasher'
import { PrismaRevokedTokenRepository } from '../src/infrastructure/persistence/prisma-revoked-token-repository'
import { PrismaUserRepository } from '../src/infrastructure/persistence/prisma-user-repository'
import { AuthenticateUseCase } from '../src/application/authenticate-use-case'
import { LogoutUseCase } from '../src/application/logout-use-case'
import { ChangePasswordUseCase } from '../src/application/change-password-use-case'
import {
  IncorrectPasswordError,
  UnauthorizedError,
} from '../src/domain/errors/auth-error'
import { createUser, prisma, resetDatabase } from './helpers/test-database'

const secret = 'test-secret'
const tokens = new JwtTokenService(secret, '1h')
const revokedTokens = new PrismaRevokedTokenRepository(prisma)
const users = new PrismaUserRepository(prisma)
const authenticate = new AuthenticateUseCase(tokens, revokedTokens, users)
const logout = new LogoutUseCase(revokedTokens)
// Low rounds: these tests are about which password is accepted, not bcrypt.
const hasher = new BcryptPasswordHasher(4)
const changePassword = new ChangePasswordUseCase(users, hasher, tokens)

async function createUserWithPassword(
  email: string,
  password: string,
): Promise<string> {
  const id = await createUser(email)
  await prisma.user.update({
    where: { id },
    data: { hash: await hasher.hash(password) },
  })
  return id
}

// JWTs carry their issue time in whole seconds; a token minted in the same
// second as a password change would survive it by design, so tests that need
// "an older token" wait for the clock to tick over.
function nextSecond(): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, 1000 - (Date.now() % 1000) + 10),
  )
}

beforeEach(resetDatabase)

after(() => prisma.$disconnect())

describe('logging out', () => {
  it('ends the session it was called with', async () => {
    const alice = await createUser('alice@example.com')
    const token = tokens.sign({ userId: alice })

    await logout.execute(await authenticate.execute(token))

    await assert.rejects(() => authenticate.execute(token), UnauthorizedError)
  })

  it("leaves the user's other sessions alone", async () => {
    const alice = await createUser('alice@example.com')
    const laptop = tokens.sign({ userId: alice })
    const phone = tokens.sign({ userId: alice })

    await logout.execute(await authenticate.execute(laptop))

    assert.equal((await authenticate.execute(phone)).userId, alice)
  })

  it('forgets revocations once their token has expired', async () => {
    await prisma.revokedToken.create({
      data: { jti: 'long-gone', expiresAt: new Date(Date.now() - 1000) },
    })

    const alice = await createUser('alice@example.com')
    await logout.execute(
      await authenticate.execute(tokens.sign({ userId: alice })),
    )

    assert.equal(
      await prisma.revokedToken.count({ where: { jti: 'long-gone' } }),
      0,
    )
    assert.equal(await prisma.revokedToken.count(), 1)
  })

  it('refuses tokens issued before sessions had an id', async () => {
    const alice = await createUser('alice@example.com')
    const legacy = jwt.sign({ userId: alice }, secret, { expiresIn: '1h' })

    await assert.rejects(() => authenticate.execute(legacy), UnauthorizedError)
  })
})

describe('a deleted account', () => {
  it("can't keep using its tokens", async () => {
    const alice = await createUser('alice@example.com')
    const token = tokens.sign({ userId: alice })
    await prisma.user.delete({ where: { id: alice } })

    await assert.rejects(() => authenticate.execute(token), UnauthorizedError)
  })
})

describe('changing the password', () => {
  it('ends every other session but keeps the one that changed it', async () => {
    const alice = await createUserWithPassword('alice@example.com', 'old-pass')
    const stolen = tokens.sign({ userId: alice })
    await nextSecond()

    const { token } = await changePassword.execute(alice, {
      currentPassword: 'old-pass',
      newPassword: 'new-password',
    })

    await assert.rejects(() => authenticate.execute(stolen), UnauthorizedError)
    assert.equal((await authenticate.execute(token)).userId, alice)
  })

  it('replaces the password when the current one matches', async () => {
    const alice = await createUserWithPassword(
      'alice@example.com',
      'old-password',
    )

    await changePassword.execute(alice, {
      currentPassword: 'old-password',
      newPassword: 'new-password',
    })

    const { hash } = await prisma.user.findUniqueOrThrow({
      where: { id: alice },
    })
    assert.ok(await hasher.compare('new-password', hash!))
    assert.ok(!(await hasher.compare('old-password', hash!)))
  })

  it('refuses a wrong current password and keeps the old one', async () => {
    const alice = await createUserWithPassword(
      'alice@example.com',
      'old-password',
    )

    await assert.rejects(
      () =>
        changePassword.execute(alice, {
          currentPassword: 'guess',
          newPassword: 'new-password',
        }),
      IncorrectPasswordError,
    )

    const { hash } = await prisma.user.findUniqueOrThrow({
      where: { id: alice },
    })
    assert.ok(await hasher.compare('old-password', hash!))
  })
})
