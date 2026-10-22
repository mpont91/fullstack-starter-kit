import { after, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { adminMetricsSchema } from '@app/shared'
import { PrismaMetricsRepository } from '../src/infrastructure/persistence/prisma-metrics-repository'
import { GetMetricsUseCase } from '../src/application/get-metrics-use-case'
import { createUser, prisma, resetDatabase } from './helpers/test-database'

const getMetrics = new GetMetricsUseCase(new PrismaMetricsRepository(prisma))

const now = new Date()
// Always in the week before this one, whatever day the suite runs.
const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

async function verify(id: string): Promise<void> {
  await prisma.user.update({ where: { id }, data: { emailVerifiedAt: now } })
}

beforeEach(resetDatabase)
after(() => prisma.$disconnect())

describe('admin metrics', () => {
  it('counts each week’s sign-ups and how many confirmed', async () => {
    await verify(await createUser('alice@example.com', lastWeek))
    await verify(await createUser('bob@example.com'))
    await createUser('carol@example.com')

    const { totalUsers, weeks } = adminMetricsSchema.parse(
      await getMetrics.execute(),
    )

    assert.equal(totalUsers, 3)
    assert.equal(weeks.length, 12)
    const [previous, current] = weeks.slice(-2)
    assert.equal(new Date(current.weekStart).getUTCDay(), 1)
    assert.ok(new Date(current.weekStart) <= now)
    assert.deepEqual(
      { signUps: previous.signUps, verified: previous.verified },
      { signUps: 1, verified: 1 },
    )
    assert.deepEqual(
      { signUps: current.signUps, verified: current.verified },
      { signUps: 2, verified: 1 },
    )
    assert.ok(weeks.slice(0, -2).every((week) => week.signUps === 0))
  })

  it('says nothing about who did what', async () => {
    const alice = await createUser('alice@example.com')

    const json = JSON.stringify(await getMetrics.execute())

    assert.ok(!json.includes(alice))
    assert.ok(!json.includes('alice@example.com'))
  })
})
