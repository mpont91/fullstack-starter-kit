import { AuthResponse, ResetPasswordRequest } from '@app/shared'
import { UserRepository } from '../domain/ports/user-repository'
import { PasswordResetTokenRepository } from '../domain/ports/password-reset-token-repository'
import { OneTimeTokenService } from '../domain/ports/one-time-token-service'
import { PasswordHasher } from '../domain/ports/password-hasher'
import { TokenService } from '../domain/ports/token-service'
import { toUser } from '../domain/mappers/user-mapper'
import { InvalidOrExpiredResetTokenError } from '../domain/errors/auth-error'
import { sessionCutoff } from '../domain/sessions'

export class ResetPasswordUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly resetTokens: PasswordResetTokenRepository,
    private readonly tokenService: OneTimeTokenService,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async execute(request: ResetPasswordRequest): Promise<AuthResponse> {
    const tokenHash = this.tokenService.hash(request.token)
    const record = await this.resetTokens.findByTokenHash(tokenHash)

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new InvalidOrExpiredResetTokenError()
    }

    // Someone resetting their password may well be locking an intruder out, so
    // every existing session ends; only the token returned below is valid.
    const hash = await this.hasher.hash(request.password)
    const user = await this.users.updatePassword(
      record.userId,
      hash,
      sessionCutoff(),
    )
    await this.resetTokens.markUsed(record.id)

    // The reset link reached their inbox, which is all a verification link
    // proves; asking for a second one would only get in the way.
    if (!user.emailVerifiedAt) {
      await this.users.markEmailVerified(user.id)
    }

    const token = this.tokens.sign({ userId: user.id })
    return { token, user: toUser(user) }
  }
}
