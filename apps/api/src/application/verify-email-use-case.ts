import { AuthResponse } from '@app/shared'
import { UserRepository } from '../domain/ports/user-repository'
import { OneTimeTokenService } from '../domain/ports/one-time-token-service'
import { TokenService } from '../domain/ports/token-service'
import { toUser } from '../domain/mappers/user-mapper'
import { InvalidOrExpiredVerificationTokenError } from '../domain/errors/auth-error'

export class VerifyEmailUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly tokenService: OneTimeTokenService,
    private readonly tokens: TokenService,
  ) {}

  // Clicking the link is the user's first login: it answers with a session so
  // they land in the app instead of on a login form.
  async execute(token: string): Promise<AuthResponse> {
    const user = await this.users.findByVerificationTokenHash(
      this.tokenService.hash(token),
    )
    if (
      !user ||
      !user.verificationExpiresAt ||
      user.verificationExpiresAt < new Date()
    ) {
      throw new InvalidOrExpiredVerificationTokenError()
    }

    const verified = await this.users.markEmailVerified(user.id)
    return {
      token: this.tokens.sign({ userId: verified.id }),
      user: toUser(verified),
    }
  }
}
