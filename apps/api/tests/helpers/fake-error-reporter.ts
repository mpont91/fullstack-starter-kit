import { ErrorReporter } from '../../src/domain/ports/error-reporter'

// Stand-in for Sentry: keeps what it was asked to report, so a test can check
// that a failure reached the owner, and with nothing but a user id.
export class FakeErrorReporter implements ErrorReporter {
  readonly reports: { error: unknown; where: string; userId?: string }[] = []

  report(error: unknown, where: string, userId?: string): void {
    this.reports.push({ error, where, userId })
  }
}
