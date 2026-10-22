import { AdminActionType } from '../types/admin'

export interface AdminActionRepository {
  record(
    adminId: string,
    action: AdminActionType,
    targetUserId: string,
    details?: Record<string, unknown>,
  ): Promise<void>
}
