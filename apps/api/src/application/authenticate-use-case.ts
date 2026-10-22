import { TokenService } from '../domain/ports/token-service'
import { RevokedTokenRepository } from '../domain/ports/revoked-token-repository'
import { UserRepository } from '../domain/ports/user-repository'
import { VerifiedToken } from '../domain/types/auth'
import { UnauthorizedError } from '../domain/errors/auth-error'
import { isIssuedBefore } from '../domain/sessions'

export class AuthenticateUseCase {
  constructor(
    private readonly tokens: TokenService,
    private readonly revokedTokens: RevokedTokenRepository,
    private readonly users: UserRepository,
  ) {}

  // A token ends three ways besides expiring: its own logout, a password
  // change or reset since it was issued, or the account being deleted.
  async execute(token: string): Promise<VerifiedToken> {
    const verified = this.tokens.verify(token)
    if (await this.revokedTokens.isRevoked(verified.jti)) {
      throw new UnauthorizedError('Session has ended')
    }

    const user = await this.users.findById(verified.userId)
    if (
      !user ||
      (user.sessionsValidFrom &&
        isIssuedBefore(verified.iat, user.sessionsValidFrom))
    ) {
      throw new UnauthorizedError('Session has ended')
    }

    return verified
  }
}
