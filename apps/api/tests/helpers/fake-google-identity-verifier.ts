import { GoogleIdentityVerifier } from '../../src/domain/ports/google-identity-verifier'
import { GoogleIdentity } from '../../src/domain/types/google-identity'

// Stand-in for Google: a credential is valid only if it was issued here, and
// stands for the identity it was issued for.
export class FakeGoogleIdentityVerifier implements GoogleIdentityVerifier {
  private readonly issued = new Map<string, GoogleIdentity>()

  issue(identity: GoogleIdentity): string {
    const credential = `google-token-${this.issued.size}`
    this.issued.set(credential, identity)
    return credential
  }

  async verify(credential: string): Promise<GoogleIdentity | null> {
    return this.issued.get(credential) ?? null
  }
}
