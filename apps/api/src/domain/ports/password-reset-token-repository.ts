import { PasswordResetTokenRecord } from '../types/password-reset'

export interface PasswordResetTokenRepository {
  create(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<PasswordResetTokenRecord>
  findByTokenHash(tokenHash: string): Promise<PasswordResetTokenRecord | null>
  markUsed(id: string): Promise<void>
}
