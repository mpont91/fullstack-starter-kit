import { User, UserLanguage } from '@app/shared'
import { UserRepository } from '../domain/ports/user-repository'
import { toUser } from '../domain/mappers/user-mapper'

export class UpdateUserLanguageUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string, language: UserLanguage): Promise<User> {
    const record = await this.users.updateLanguage(userId, language)
    return toUser(record)
  }
}
