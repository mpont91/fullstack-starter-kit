import { UserRepository } from '../domain/ports/user-repository'
import { AdminActionRepository } from '../domain/ports/admin-action-repository'
import { ForbiddenError, UserNotFoundError } from '../domain/errors/auth-error'

export class DeleteUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly adminActions: AdminActionRepository,
  ) {}

  // Same cascade as a user deleting their own account. An admin can't use it
  // on themselves: that would also remove the last way back into the panel,
  // and the profile already has its own, password-confirmed, delete.
  async execute(adminId: string, userId: string): Promise<void> {
    if (adminId === userId) {
      throw new ForbiddenError("Admins can't delete their own account here")
    }
    const user = await this.users.findById(userId)
    if (!user) {
      throw new UserNotFoundError()
    }

    await this.users.delete(userId)
    await this.adminActions.record(adminId, 'DELETE_USER', userId)
  }
}
