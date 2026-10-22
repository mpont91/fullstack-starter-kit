import { UserRepository } from '../domain/ports/user-repository'
import { ForbiddenError } from '../domain/errors/auth-error'

export class AuthorizeAdminUseCase {
  constructor(private readonly users: UserRepository) {}

  // Read from the database on every request rather than carried in the token,
  // so revoking someone's admin role takes effect immediately.
  async execute(userId: string): Promise<void> {
    const user = await this.users.findById(userId)
    if (user?.role !== 'ADMIN') {
      throw new ForbiddenError()
    }
  }
}
