import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { TokenService } from '../../domain/ports/token-service'
import {
  TokenPayload,
  VerifiedToken,
  verifiedTokenSchema,
} from '../../domain/types/auth'
import { UnauthorizedError } from '../../domain/errors/auth-error'

export class JwtTokenService implements TokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string,
  ) {}

  sign(payload: TokenPayload): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn as jwt.SignOptions['expiresIn'],
      jwtid: randomUUID(),
    })
  }

  // A token without a jti predates logout and could never be revoked, so it is
  // refused like any other invalid one: its holder just logs in again.
  verify(token: string): VerifiedToken {
    try {
      const decoded = jwt.verify(token, this.secret)
      return verifiedTokenSchema.parse(decoded)
    } catch {
      throw new UnauthorizedError('Invalid or expired token')
    }
  }
}
