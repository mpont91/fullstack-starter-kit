import { UserRepository } from '../domain/ports/user-repository'
import { PasswordResetTokenRepository } from '../domain/ports/password-reset-token-repository'
import { OneTimeTokenService } from '../domain/ports/one-time-token-service'
import { InvalidOrExpiredResetTokenError } from '../domain/errors/auth-error'

export class GetPasswordResetEmailUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly resetTokens: PasswordResetTokenRepository,
    private readonly tokenService: OneTimeTokenService,
  ) {}

  async execute(token: string): Promise<string> {
    const tokenHash = this.tokenService.hash(token)
    const record = await this.resetTokens.findByTokenHash(tokenHash)

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new InvalidOrExpiredResetTokenError()
    }

    const user = await this.users.findById(record.userId)
    if (!user) {
      throw new InvalidOrExpiredResetTokenError()
    }

    return user.email
  }
}
