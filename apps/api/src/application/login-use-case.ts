import { AuthResponse, LoginRequest } from '@app/shared'
import { UserRepository } from '../domain/ports/user-repository'
import { PasswordHasher } from '../domain/ports/password-hasher'
import { TokenService } from '../domain/ports/token-service'
import { toUser } from '../domain/mappers/user-mapper'
import {
  EmailNotVerifiedError,
  InvalidCredentialsError,
} from '../domain/errors/auth-error'

export class LoginUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async execute(request: LoginRequest): Promise<AuthResponse> {
    const user = await this.users.findByEmail(request.email)
    if (!user || !user.hash) {
      throw new InvalidCredentialsError()
    }

    const matches = await this.hasher.compare(request.password, user.hash)
    if (!matches) {
      throw new InvalidCredentialsError()
    }

    // Checked after the password, so this only tells someone who already
    // knows it that the account is waiting on its confirmation link.
    if (!user.emailVerifiedAt) {
      throw new EmailNotVerifiedError()
    }

    const token = this.tokens.sign({ userId: user.id })

    return { token, user: toUser(user) }
  }
}
