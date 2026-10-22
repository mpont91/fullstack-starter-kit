// Failures the owner must hear about without a user telling them. `where` names
// the place that failed; the user id is the only thing about a user that goes
// with it — never an email, a user's data or a token.
export interface ErrorReporter {
  report(error: unknown, where: string, userId?: string): void
}
