import { RevokedTokenRepository } from '../domain/ports/revoked-token-repository'
import { VerifiedToken } from '../domain/types/auth'

export class LogoutUseCase {
  constructor(private readonly revokedTokens: RevokedTokenRepository) {}

  // Ends this session only; the user stays logged in on their other devices.
  async execute(token: VerifiedToken): Promise<void> {
    await this.revokedTokens.revoke(token.jti, new Date(token.exp * 1000))
  }
}
