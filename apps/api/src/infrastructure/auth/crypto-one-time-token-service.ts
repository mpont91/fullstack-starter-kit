import { createHash, randomBytes } from 'node:crypto'
import { OneTimeTokenService } from '../../domain/ports/one-time-token-service'

export class CryptoOneTimeTokenService implements OneTimeTokenService {
  generate(): string {
    return randomBytes(32).toString('base64url')
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }
}
