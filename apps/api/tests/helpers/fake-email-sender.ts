import { UserLanguage } from '@app/shared'
import { EmailSender } from '../../src/domain/ports/email-sender'

// Stand-in for Resend: keeps every link it was asked to send, which is how the
// tests get hold of the token a real user would click.
export class FakeEmailSender implements EmailSender {
  readonly welcomes: { email: string; url: string; language: UserLanguage }[] =
    []
  readonly resets: { email: string; url: string; language: UserLanguage }[] = []

  async sendWelcome(
    email: string,
    url: string,
    language: UserLanguage,
  ): Promise<void> {
    this.welcomes.push({ email, url, language })
  }

  async sendPasswordReset(
    email: string,
    url: string,
    language: UserLanguage,
  ): Promise<void> {
    this.resets.push({ email, url, language })
  }

  lastWelcomeToken(): string {
    const last = this.welcomes.at(-1)
    if (!last) throw new Error('No welcome email was sent')
    return new URL(last.url).searchParams.get('token')!
  }
}
