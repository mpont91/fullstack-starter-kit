import { after, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { PrismaUserRepository } from '../src/infrastructure/persistence/prisma-user-repository'
import { BcryptPasswordHasher } from '../src/infrastructure/auth/bcrypt-password-hasher'
import { DeleteAccountUseCase } from '../src/application/delete-account-use-case'
import { IncorrectPasswordError } from '../src/domain/errors/auth-error'
import { FakeGoogleIdentityVerifier } from './helpers/fake-google-identity-verifier'
import { createUser, prisma, resetDatabase } from './helpers/test-database'

// Low rounds: these tests are about what gets deleted, not about bcrypt.
const hasher = new BcryptPasswordHasher(4)
const google = new FakeGoogleIdentityVerifier()
const deleteAccount = new DeleteAccountUseCase(
  new PrismaUserRepository(prisma),
  hasher,
  google,
)

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

// Something the user owns, to see it go with them through the cascade.
async function createResetToken(userId: string): Promise<void> {
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: `hash-${userId}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  })
}

function tokensOf(userId: string): Promise<number> {
  return prisma.passwordResetToken.count({ where: { userId } })
}

beforeEach(resetDatabase)

after(() => prisma.$disconnect())

describe('deleting an account', () => {
  it('removes the user along with what they own', async () => {
    const alice = await createUserWithPassword('alice@example.com', 'secret')
    await createResetToken(alice)

    await deleteAccount.execute(alice, { password: 'secret' })

    assert.equal(await prisma.user.count({ where: { id: alice } }), 0)
    assert.equal(await tokensOf(alice), 0)
  })

  it('refuses a wrong password and keeps everything', async () => {
    const alice = await createUserWithPassword('alice@example.com', 'secret')
    await createResetToken(alice)

    await assert.rejects(
      () => deleteAccount.execute(alice, { password: 'guess' }),
      IncorrectPasswordError,
    )
    assert.equal(await prisma.user.count({ where: { id: alice } }), 1)
    assert.equal(await tokensOf(alice), 1)
  })

  it('leaves other users untouched', async () => {
    const alice = await createUserWithPassword('alice@example.com', 'secret')
    const bob = await createUserWithPassword('bob@example.com', 'secret')
    await createResetToken(bob)

    await deleteAccount.execute(alice, { password: 'secret' })

    assert.equal(await prisma.user.count({ where: { id: bob } }), 1)
    assert.equal(await tokensOf(bob), 1)
  })

  it('accepts a fresh Google sign-in on an account without a password', async () => {
    const alice = await prisma.user.create({
      data: { email: 'alice@example.com', googleId: 'g-alice' },
    })
    const credential = google.issue({
      googleId: 'g-alice',
      email: 'alice@example.com',
      emailVerified: true,
    })

    await deleteAccount.execute(alice.id, { googleCredential: credential })

    assert.equal(await prisma.user.count({ where: { id: alice.id } }), 0)
  })

  it("refuses a Google sign-in that isn't the account's own", async () => {
    const alice = await prisma.user.create({
      data: { email: 'alice@example.com', googleId: 'g-alice' },
    })
    const mallory = google.issue({
      googleId: 'g-mallory',
      email: 'mallory@example.com',
      emailVerified: true,
    })

    await assert.rejects(
      () => deleteAccount.execute(alice.id, { googleCredential: mallory }),
      IncorrectPasswordError,
    )
    await assert.rejects(
      () => deleteAccount.execute(alice.id, { googleCredential: 'forged' }),
      IncorrectPasswordError,
    )
    assert.equal(await prisma.user.count({ where: { id: alice.id } }), 1)
  })

  it('refuses any password on an account without one', async () => {
    const alice = await prisma.user.create({
      data: { email: 'alice@example.com', googleId: 'g-alice' },
    })

    await assert.rejects(
      () => deleteAccount.execute(alice.id, { password: 'anything' }),
      IncorrectPasswordError,
    )
  })
})
