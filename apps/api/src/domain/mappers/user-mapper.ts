import { AdminUserSummary, User } from '@app/shared'
import { UserRecord } from '../types/user'

export function toUser(record: UserRecord): User {
  return {
    id: record.id,
    email: record.email,
    language: record.language,
    role: record.role,
    hasPassword: record.hash !== null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export function toAdminUserSummary(record: UserRecord): AdminUserSummary {
  return {
    id: record.id,
    email: record.email,
    role: record.role,
    createdAt: record.createdAt.toISOString(),
    emailVerifiedAt: record.emailVerifiedAt?.toISOString() ?? null,
    hasPassword: record.hash !== null,
    hasGoogle: record.googleId !== null,
  }
}
