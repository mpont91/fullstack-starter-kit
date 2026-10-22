import { DeleteAccountRequest } from '@app/shared'
import { UserRepository } from '../domain/ports/user-repository'
import { PasswordHasher } from '../domain/ports/password-hasher'
import { GoogleIdentityVerifier } from '../domain/ports/google-identity-verifier'
import { UserRecord } from '../domain/types/user'
import {
  IncorrectPasswordError,
  UserNotFoundError,
} from '../domain/errors/auth-error'

export class DeleteAccountUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly google: GoogleIdentityVerifier,
  ) {}

  // Asks for the password again, or for a fresh Google sign-in on an account
  // without one, so a token left on a shared machine isn't enough to wipe
  // someone's account. Everything they own goes with the user through the
  // schema's cascades.
  async execute(userId: string, request: DeleteAccountRequest): Promise<void> {
    const user = await this.users.findById(userId)
    if (!user) {
      throw new UserNotFoundError()
    }

    if (!(await this.confirmed(user, request))) {
      throw new IncorrectPasswordError()
    }

    await this.users.delete(userId)
  }

  private async confirmed(
    user: UserRecord,
    request: DeleteAccountRequest,
  ): Promise<boolean> {
    if ('password' in request) {
      return (
        user.hash !== null && this.hasher.compare(request.password, user.hash)
      )
    }
    // The Google account signing in has to be the one linked to this user,
    // not merely any valid one.
    const identity = await this.google.verify(request.googleCredential)
    return identity !== null && identity.googleId === user.googleId
  }
}
