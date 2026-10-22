import { after, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { adminUserPageSchema } from '@app/shared'
import { PrismaUserRepository } from '../src/infrastructure/persistence/prisma-user-repository'
import { PrismaAdminActionRepository } from '../src/infrastructure/persistence/prisma-admin-action-repository'
import { AuthorizeAdminUseCase } from '../src/application/authorize-admin-use-case'
import { ListUsersUseCase } from '../src/application/list-users-use-case'
import { DeleteUserUseCase } from '../src/application/delete-user-use-case'
import {
  ForbiddenError,
  UserNotFoundError,
} from '../src/domain/errors/auth-error'
import { createUser, prisma, resetDatabase } from './helpers/test-database'

const users = new PrismaUserRepository(prisma)
const adminActions = new PrismaAdminActionRepository(prisma)

const authorizeAdmin = new AuthorizeAdminUseCase(users)
const listUsers = new ListUsersUseCase(users)
const deleteUser = new DeleteUserUseCase(users, adminActions)

async function createAdmin(email: string): Promise<string> {
  const id = await createUser(email)
  await prisma.user.update({ where: { id }, data: { role: 'ADMIN' } })
  return id
}

beforeEach(resetDatabase)
after(() => prisma.$disconnect())

describe('admin access', () => {
  it('lets admins through and stops everyone else', async () => {
    const admin = await createAdmin('admin@example.com')
    const alice = await createUser('alice@example.com')

    await authorizeAdmin.execute(admin)
    await assert.rejects(() => authorizeAdmin.execute(alice), ForbiddenError)
    await assert.rejects(() => authorizeAdmin.execute('gone'), ForbiddenError)
  })
})

describe('listing users', () => {
  it('summarises each account, never its secrets', async () => {
    const alice = await createUser('alice@example.com')
    await prisma.user.update({
      where: { id: alice },
      data: { googleId: 'google-alice', emailVerifiedAt: new Date() },
    })

    const page = await listUsers.execute({ page: 1, pageSize: 20 })
    adminUserPageSchema.parse(page)

    assert.equal(page.total, 1)
    const [summary] = page.items
    assert.equal(summary.email, 'alice@example.com')
    assert.equal(summary.hasPassword, true)
    assert.equal(summary.hasGoogle, true)
    assert.ok(summary.emailVerifiedAt)
    const json = JSON.stringify(page)
    assert.ok(!json.includes('google-alice'))
    assert.ok(!json.includes('"hash"'))
  })

  it('searches by email and pages the result', async () => {
    await createUser('alice@example.com')
    await createUser('bob@example.com')
    await createUser('ALICIA@example.com')

    const found = await listUsers.execute({
      search: 'ali',
      page: 1,
      pageSize: 1,
    })

    assert.equal(found.total, 2)
    assert.equal(found.items.length, 1)
  })
})

describe('deleting a user', () => {
  it('removes the account and records who did it', async () => {
    const admin = await createAdmin('admin@example.com')
    const alice = await createUser('alice@example.com')

    await deleteUser.execute(admin, alice)

    assert.equal(await prisma.user.count({ where: { id: alice } }), 0)
    const [action] = await prisma.adminAction.findMany()
    assert.equal(action.adminId, admin)
    assert.equal(action.action, 'DELETE_USER')
    assert.equal(action.targetUserId, alice)
  })

  it("won't let an admin delete themselves", async () => {
    const admin = await createAdmin('admin@example.com')

    await assert.rejects(() => deleteUser.execute(admin, admin), ForbiddenError)
    assert.equal(await prisma.user.count({ where: { id: admin } }), 1)
  })

  it('refuses an unknown user, leaving no trail', async () => {
    const admin = await createAdmin('admin@example.com')

    await assert.rejects(
      () => deleteUser.execute(admin, 'gone'),
      UserNotFoundError,
    )
    assert.equal(await prisma.adminAction.count(), 0)
  })
})
