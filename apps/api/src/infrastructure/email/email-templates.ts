import { APP_NAME, UserLanguage } from '@app/shared'
import { renderEmailLayout } from './email-layout'

export interface Email {
  subject: string
  html: string
}

// A PNG, not the web's SVG logo: Gmail and Outlook don't render SVG images.
function logoUrlFrom(url: string): string {
  return `${new URL(url).origin}/apple-touch-icon.png`
}

const passwordResetCopy: Record<
  UserLanguage,
  {
    subject: string
    preheader: string
    heading: string
    intro: string
    button: string
    expiry: string
    ignore: string
  }
> = {
  EN: {
    subject: `Reset your ${APP_NAME} password`,
    preheader: 'Use this link to choose a new password.',
    heading: 'Reset your password',
    intro: 'We received a request to reset the password for your account.',
    button: 'Choose a new password',
    expiry: 'This link expires in 1 hour.',
    ignore: "If you didn't request this, you can safely ignore this email.",
  },
  ES: {
    subject: `Restablece tu contraseña de ${APP_NAME}`,
    preheader: 'Usa este enlace para elegir una nueva contraseña.',
    heading: 'Restablece tu contraseña',
    intro:
      'Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.',
    button: 'Elegir una nueva contraseña',
    expiry: 'Este enlace caduca en 1 hora.',
    ignore: 'Si no has sido tú, puedes ignorar este email con tranquilidad.',
  },
}

export function passwordResetEmail(
  resetUrl: string,
  language: UserLanguage,
): Email {
  const t = passwordResetCopy[language]

  return {
    subject: t.subject,
    html: renderEmailLayout({
      language,
      logoUrl: logoUrlFrom(resetUrl),
      preheader: t.preheader,
      heading: t.heading,
      paragraphs: [t.intro],
      cta: { text: t.button, url: resetUrl },
      footer: [t.expiry, t.ignore],
    }),
  }
}

const welcomeCopy: Record<
  UserLanguage,
  {
    subject: string
    preheader: string
    heading: string
    confirm: string
    button: string
    expiry: string
    footer: string
  }
> = {
  EN: {
    subject: `Welcome to ${APP_NAME}`,
    preheader: 'Confirm your email to activate your account.',
    heading: `Welcome to ${APP_NAME}`,
    confirm: 'Confirm your email address to activate your account.',
    button: 'Confirm my email',
    expiry:
      'This link expires in 24 hours. You can ask for a new one from the login page.',
    footer: "If you didn't create this account, you can ignore this email.",
  },
  ES: {
    subject: `Bienvenido a ${APP_NAME}`,
    preheader: 'Confirma tu email para activar tu cuenta.',
    heading: `Bienvenido a ${APP_NAME}`,
    confirm: 'Confirma tu dirección de email para activar tu cuenta.',
    button: 'Confirmar mi email',
    expiry:
      'Este enlace caduca en 24 horas. Puedes pedir otro desde la página de inicio de sesión.',
    footer: 'Si no has creado tú esta cuenta, puedes ignorar este email.',
  },
}

export function welcomeEmail(verifyUrl: string, language: UserLanguage): Email {
  const t = welcomeCopy[language]

  return {
    subject: t.subject,
    html: renderEmailLayout({
      language,
      logoUrl: logoUrlFrom(verifyUrl),
      preheader: t.preheader,
      heading: t.heading,
      paragraphs: [t.confirm],
      cta: { text: t.button, url: verifyUrl },
      footer: [t.expiry, t.footer],
    }),
  }
}
