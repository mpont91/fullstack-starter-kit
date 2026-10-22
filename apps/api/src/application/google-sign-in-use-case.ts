import { AuthResponse, GoogleSignInRequest } from '@app/shared'
import { UserRepository } from '../domain/ports/user-repository'
import { GoogleIdentityVerifier } from '../domain/ports/google-identity-verifier'
import { TokenService } from '../domain/ports/token-service'
import { toUser } from '../domain/mappers/user-mapper'
import { sessionCutoff } from '../domain/sessions'
import { InvalidCredentialsError } from '../domain/errors/auth-error'
import { UserRecord } from '../domain/types/user'

export class GoogleSignInUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly google: GoogleIdentityVerifier,
    private readonly tokens: TokenService,
  ) {}

  // Logs in, links or registers, whichever applies, and always answers with a
  // session. An address Google hasn't verified is refused outright: it would
  // either open someone else's account or create one nobody has confirmed.
  async execute(request: GoogleSignInRequest): Promise<AuthResponse> {
    const identity = await this.google.verify(request.credential)
    if (!identity || !identity.emailVerified) {
      throw new InvalidCredentialsError()
    }

    const user =
      (await this.users.findByGoogleId(identity.googleId)) ??
      (await this.link(identity.email, identity.googleId)) ??
      (await this.users.createWithGoogle(
        identity.email,
        identity.googleId,
        request.language,
      ))

    return {
      token: this.tokens.sign({ userId: user.id }),
      user: toUser(user),
    }
  }

  // An account with this email but no Google id yet: the same person, since
  // Google has verified the address, so it's opened rather than duplicated.
  private async link(
    email: string,
    googleId: string,
  ): Promise<UserRecord | null> {
    const existing = await this.users.findByEmail(email)
    if (!existing) {
      return null
    }

    // Never confirmed means whoever chose that password never proved the
    // address was theirs: it may be someone who registered it first to get in
    // later. The owner has now proved it, so that password goes, along with
    // any session it opened. They can set their own by email.
    if (!existing.emailVerifiedAt) {
      await this.users.removePassword(existing.id, sessionCutoff())
      await this.users.markEmailVerified(existing.id)
    }

    return this.users.setGoogleId(existing.id, googleId)
  }
}
