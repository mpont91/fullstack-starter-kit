import { OAuth2Client } from 'google-auth-library'
import { GoogleIdentityVerifier } from '../../domain/ports/google-identity-verifier'
import { GoogleIdentity } from '../../domain/types/google-identity'

// Checks the token's signature against Google's published keys, its expiry,
// its issuer and that it was issued to this app's client id: the web never
// decides who someone is.
export class GoogleAuthLibraryVerifier implements GoogleIdentityVerifier {
  private readonly client = new OAuth2Client()

  constructor(private readonly clientId: string) {}

  async verify(credential: string): Promise<GoogleIdentity | null> {
    // Fetched (and cached) first and outside the catch, so Google being
    // unreachable is a 500 of ours rather than the user's token "rejected".
    await this.client.getFederatedSignonCertsAsync()

    try {
      const ticket = await this.client.verifyIdToken({
        idToken: credential,
        audience: this.clientId,
      })
      const payload = ticket.getPayload()
      if (!payload?.email) {
        return null
      }
      return {
        googleId: payload.sub,
        email: payload.email,
        emailVerified: payload.email_verified === true,
      }
    } catch {
      return null
    }
  }
}
