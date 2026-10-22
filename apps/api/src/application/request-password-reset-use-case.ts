import { UserRepository } from '../domain/ports/user-repository'
import { PasswordResetTokenRepository } from '../domain/ports/password-reset-token-repository'
import { OneTimeTokenService } from '../domain/ports/one-time-token-service'
import { EmailSender } from '../domain/ports/email-sender'

const TOKEN_TTL_MS = 60 * 60 * 1000

export class RequestPasswordResetUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly resetTokens: PasswordResetTokenRepository,
    private readonly tokenService: OneTimeTokenService,
    private readonly emailSender: EmailSender,
    private readonly frontendUrl: string,
  ) {}

  async execute(email: string): Promise<void> {
    const user = await this.users.findByEmail(email)
    // Silently succeed on an unknown email: revealing the difference would
    // let anyone probe which addresses have an account.
    if (!user) {
      return
    }

    const token = this.tokenService.generate()
    const tokenHash = this.tokenService.hash(token)
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS)
    await this.resetTokens.create(user.id, tokenHash, expiresAt)

    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`
    await this.emailSender.sendPasswordReset(
      user.email,
      resetUrl,
      user.language,
    )
  }
}
