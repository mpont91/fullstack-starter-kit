import {
  PasswordResetToken as PrismaPasswordResetToken,
  PrismaClient,
} from '@prisma/client'
import { PasswordResetTokenRepository } from '../../domain/ports/password-reset-token-repository'
import { PasswordResetTokenRecord } from '../../domain/types/password-reset'

export class PrismaPasswordResetTokenRepository implements PasswordResetTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<PasswordResetTokenRecord> {
    const record = await this.prisma.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    })
    return toPasswordResetTokenRecord(record)
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<PasswordResetTokenRecord | null> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    })
    return record ? toPasswordResetTokenRecord(record) : null
  }

  async markUsed(id: string): Promise<void> {
    await this.prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    })
  }
}

function toPasswordResetTokenRecord(
  record: PrismaPasswordResetToken,
): PasswordResetTokenRecord {
  return {
    id: record.id,
    userId: record.userId,
    tokenHash: record.tokenHash,
    expiresAt: record.expiresAt,
    usedAt: record.usedAt,
    createdAt: record.createdAt,
  }
}
