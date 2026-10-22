import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Scoping by user, revoking sessions and the admin's counts are SQL behaviour;
// faking the database would test none of it, so these run against a real
// Postgres. `make test` points TEST_DATABASE_URL at a throwaway database.
const connectionString = process.env.TEST_DATABASE_URL

if (!connectionString) {
  throw new Error(
    'TEST_DATABASE_URL is not set — run the tests with `make test`',
  )
}

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
})

// Every table but Prisma's own, read from the catalog, so a new model is
// truncated without anyone remembering to list it here.
export async function resetDatabase(): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`
  if (tables.length === 0) return
  const names = tables.map(({ tablename }) => `"${tablename}"`).join(', ')
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`,
  )
}

export async function createUser(
  email: string,
  createdAt?: Date,
): Promise<string> {
  const user = await prisma.user.create({
    data: { email, hash: 'x', ...(createdAt ? { createdAt } : {}) },
  })
  return user.id
}
