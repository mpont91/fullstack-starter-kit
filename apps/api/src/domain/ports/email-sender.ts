import { UserLanguage } from '@app/shared'

export interface EmailSender {
  sendPasswordReset(
    email: string,
    resetUrl: string,
    language: UserLanguage,
  ): Promise<void>
  // The welcome email is also the verification email: its button is the
  // confirmation link, and the account can't be used until it's clicked.
  sendWelcome(
    email: string,
    verifyUrl: string,
    language: UserLanguage,
  ): Promise<void>
}
