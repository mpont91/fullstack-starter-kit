import { UserLanguage } from '@app/shared'
import { Resend } from 'resend'
import { EmailSender } from '../../domain/ports/email-sender'
import { EmailSettings } from '../../domain/types/settings'
import { Email, passwordResetEmail, welcomeEmail } from './email-templates'

export class ResendEmailSender implements EmailSender {
  private readonly client: Resend

  constructor(private readonly settings: EmailSettings) {
    this.client = new Resend(settings.resendApiKey)
  }

  async sendPasswordReset(
    email: string,
    resetUrl: string,
    language: UserLanguage,
  ): Promise<void> {
    await this.send(email, passwordResetEmail(resetUrl, language))
  }

  async sendWelcome(
    email: string,
    verifyUrl: string,
    language: UserLanguage,
  ): Promise<void> {
    await this.send(email, welcomeEmail(verifyUrl, language))
  }

  private async send(to: string, { subject, html }: Email): Promise<void> {
    // The Resend SDK resolves with `{ data, error }` on an API-level failure
    // rather than rejecting — an unchecked `error` here would make a send
    // that never happened look like a success to the caller.
    const { error } = await this.client.emails.send({
      from: this.settings.fromAddress,
      to,
      subject,
      html,
    })

    if (error) {
      throw new Error(`Resend failed to send "${subject}": ${error.message}`)
    }
  }
}
