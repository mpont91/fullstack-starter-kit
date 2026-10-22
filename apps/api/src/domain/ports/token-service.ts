import { TokenPayload, VerifiedToken } from '../types/auth'

export interface TokenService {
  sign(payload: TokenPayload): string
  verify(token: string): VerifiedToken
}
