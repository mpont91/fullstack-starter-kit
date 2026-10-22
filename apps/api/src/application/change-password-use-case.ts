import { AuthResponse, ChangePasswordRequest } from '@app/shared'
import { UserRepository } from '../domain/ports/user-repository'
import { PasswordHasher } from '../domain/ports/password-hasher'
import { TokenService } from '../domain/ports/token-service'
import { toUser } from '../domain/mappers/user-mapper'
import { sessionCutoff } from '../domain/sessions'
import {
  IncorrectPasswordError,
  UserNotFoundError,
} from '../domain/errors/auth-error'

export class ChangePasswordUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  // Ends every session, this one included, and hands back a fresh token so
  // the device that made the change stays logged in. Anyone holding an old
  // token — a stolen one, typically, which is why passwords get changed — is
  // out.
  async execute(
    userId: string,
    request: ChangePasswordRequest,
  ): Promise<AuthResponse> {
    const user = await this.users.findById(userId)
    if (!user) {
      throw new UserNotFoundError()
    }

    const matches =
      user.hash !== null &&
      (await this.hasher.compare(request.currentPassword, user.hash))
    if (!matches) {
      throw new IncorrectPasswordError()
    }

    const updated = await this.users.updatePassword(
      userId,
      await this.hasher.hash(request.newPassword),
      sessionCutoff(),
    )

    const token = this.tokens.sign({ userId })
    return { token, user: toUser(updated) }
  }
}
