// The cut-off that ends every session issued so far. JWTs carry their issue
// time in whole seconds, so the cut-off is rounded down to match: the token
// handed out right after it, in the same second, has to stay valid. The price
// is that a token issued earlier in that same second survives too.
export function sessionCutoff(now: Date = new Date()): Date {
  return new Date(Math.floor(now.getTime() / 1000) * 1000)
}

export function isIssuedBefore(issuedAtSeconds: number, cutoff: Date): boolean {
  return issuedAtSeconds * 1000 < cutoff.getTime()
}
