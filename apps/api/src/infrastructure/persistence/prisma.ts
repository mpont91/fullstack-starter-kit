import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })

// The default formats print the query's arguments in the error message, and
// a failed write would carry a user's data or an email into the logs and
// Sentry.
export const prisma = new PrismaClient({ adapter, errorFormat: 'minimal' })
