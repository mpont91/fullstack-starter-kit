import { Prisma, PrismaClient } from '@prisma/client'
import { AdminActionRepository } from '../../domain/ports/admin-action-repository'
import { AdminActionType } from '../../domain/types/admin'

export class PrismaAdminActionRepository implements AdminActionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async record(
    adminId: string,
    action: AdminActionType,
    targetUserId: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.adminAction.create({
      data: {
        adminId,
        action,
        targetUserId,
        details: details as Prisma.InputJsonValue | undefined,
      },
    })
  }
}
