import { UserLanguage } from '@app/shared'
import { UserRecord } from '../types/user'

export interface UserRepository {
  create(
    email: string,
    hash: string,
    language: UserLanguage,
  ): Promise<UserRecord>
  // Already verified: Google has confirmed the address. No password.
  createWithGoogle(
    email: string,
    googleId: string,
    language: UserLanguage,
  ): Promise<UserRecord>
  findByEmail(email: string): Promise<UserRecord | null>
  findByGoogleId(googleId: string): Promise<UserRecord | null>
  setGoogleId(id: string, googleId: string): Promise<UserRecord>
  findById(id: string): Promise<UserRecord | null>
  updateLanguage(id: string, language: UserLanguage): Promise<UserRecord>
  updatePassword(
    id: string,
    hash: string,
    sessionsValidFrom: Date,
  ): Promise<UserRecord>
  removePassword(id: string, sessionsValidFrom: Date): Promise<UserRecord>
  delete(id: string): Promise<void>
  setVerificationToken(
    id: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void>
  findByVerificationTokenHash(tokenHash: string): Promise<UserRecord | null>
  // Records the confirmation and forgets the link, so it can't be used twice.
  markEmailVerified(id: string): Promise<UserRecord>
  // Newest accounts first, optionally narrowed to emails containing `search`.
  list(
    search: string | undefined,
    skip: number,
    take: number,
  ): Promise<{ records: UserRecord[]; total: number }>
}
