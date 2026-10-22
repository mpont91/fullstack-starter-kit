import { GoogleIdentity } from '../types/google-identity'

export interface GoogleIdentityVerifier {
  // Null when the token isn't a valid Google ID token issued to this app:
  // forged, expired, or meant for another client.
  verify(credential: string): Promise<GoogleIdentity | null>
}
