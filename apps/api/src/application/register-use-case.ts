import { RegisterRequest, RegisterResponse } from '@app/shared'
import { UserRepository } from '../domain/ports/user-repository'
import { PasswordHasher } from '../domain/ports/password-hasher'
import { EmailAlreadyInUseError } from '../domain/errors/auth-error'
import { ErrorReporter } from '../domain/ports/error-reporter'
import { VerificationEmailService } from './verification-email-service'

export class RegisterUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly verificationEmail: VerificationEmailService,
    private readonly errorReporter: ErrorReporter,
  ) {}

  // No session yet: the account only becomes usable once the link in the
  // welcome email is clicked, which is what proves the address is theirs.
  async execute(request: RegisterRequest): Promise<RegisterResponse> {
    const existing = await this.users.findByEmail(request.email)
    if (existing) {
      throw new EmailAlreadyInUseError()
    }

    const hash = await this.hasher.hash(request.password)
    const user = await this.users.create(request.email, hash, request.language)

    // The account exists either way, so a flaky email provider shouldn't turn
    // the registration into a 500 — the login page can send the link again.
    try {
      await this.verificationEmail.send(user)
    } catch (error) {
      this.errorReporter.report(error, 'welcome-email', user.id)
    }

    return { email: user.email }
  }
}
