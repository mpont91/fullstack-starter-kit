import { UserRepository } from '../domain/ports/user-repository'
import { OneTimeTokenService } from '../domain/ports/one-time-token-service'
import { EmailSender } from '../domain/ports/email-sender'
import { UserRecord } from '../domain/types/user'

export const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000

// Shared by registering and resending, so it isn't a use case. Each call issues
// a fresh link and stores only its hash, which also invalidates whatever link
// was sent before.
export class VerificationEmailService {
  constructor(
    private readonly users: UserRepository,
    private readonly tokenService: OneTimeTokenService,
    private readonly emailSender: EmailSender,
    private readonly frontendUrl: string,
  ) {}

  async send(user: UserRecord): Promise<void> {
    const token = this.tokenService.generate()
    await this.users.setVerificationToken(
      user.id,
      this.tokenService.hash(token),
      new Date(Date.now() + VERIFICATION_TTL_MS),
    )

    await this.emailSender.sendWelcome(
      user.email,
      `${this.frontendUrl}/verify-email?token=${token}`,
      user.language,
    )
  }
}
