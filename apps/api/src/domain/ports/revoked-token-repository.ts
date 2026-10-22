export interface RevokedTokenRepository {
  revoke(jti: string, expiresAt: Date): Promise<void>
  isRevoked(jti: string): Promise<boolean>
}
