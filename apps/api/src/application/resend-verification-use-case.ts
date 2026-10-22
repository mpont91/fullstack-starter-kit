import { UserRepository } from '../domain/ports/user-repository'
import {
  VERIFICATION_TTL_MS,
  VerificationEmailService,
} from './verification-email-service'

const RESEND_COOLDOWN_MS = 60 * 1000

export class ResendVerificationUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly verificationEmail: VerificationEmailService,
  ) {}

  // Answers the same whether or not anything was sent — unknown email, already
  // verified, or asked again within the cooldown — so it can't be used to
  // probe which addresses have an account, nor to flood someone's inbox.
  async execute(email: string): Promise<void> {
    const user = await this.users.findByEmail(email)
    if (!user || user.emailVerifiedAt) {
      return
    }

    const lastSentAt = user.verificationExpiresAt
      ? user.verificationExpiresAt.getTime() - VERIFICATION_TTL_MS
      : 0
    if (Date.now() - lastSentAt < RESEND_COOLDOWN_MS) {
      return
    }

    await this.verificationEmail.send(user)
  }
}
