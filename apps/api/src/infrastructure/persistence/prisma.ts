import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { settings } from '../../settings'

const adapter = new PrismaPg({ connectionString: settings.databaseUrl })

// The default formats print the query's arguments in the error message, and
// a failed write would carry a user's data or an email into the logs and
// Sentry.
export const prisma = new PrismaClient({ adapter, errorFormat: 'minimal' })
