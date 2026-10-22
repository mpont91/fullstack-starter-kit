import { User } from '@app/shared'
import { UserRepository } from '../domain/ports/user-repository'
import { toUser } from '../domain/mappers/user-mapper'
import { UserNotFoundError } from '../domain/errors/auth-error'

export class GetMeUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string): Promise<User> {
    const user = await this.users.findById(userId)
    if (!user) {
      throw new UserNotFoundError()
    }

    return toUser(user)
  }
}
