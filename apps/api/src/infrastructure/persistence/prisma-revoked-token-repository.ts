import { PrismaClient } from '@prisma/client'
import { RevokedTokenRepository } from '../../domain/ports/revoked-token-repository'

export class PrismaRevokedTokenRepository implements RevokedTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Pruning on write keeps the table to the tokens that could still be used,
  // without a scheduled job. Logging out twice is harmless, hence the upsert.
  async revoke(jti: string, expiresAt: Date): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.revokedToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      }),
      this.prisma.revokedToken.upsert({
        where: { jti },
        create: { jti, expiresAt },
        update: {},
      }),
    ])
  }

  async isRevoked(jti: string): Promise<boolean> {
    const count = await this.prisma.revokedToken.count({ where: { jti } })
    return count > 0
  }
}
