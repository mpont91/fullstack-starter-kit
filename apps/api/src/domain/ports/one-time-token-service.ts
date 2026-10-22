export interface OneTimeTokenService {
  generate(): string
  hash(token: string): string
}
