import 'dotenv/config'
import { APP_DOMAIN, APP_NAME } from '@app/shared'
import { type Settings, settingsSchema } from './domain/types/settings'

export const settings: Settings = settingsSchema.parse({
  port: process.env.PORT ?? 3000,
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: '7d',
    bcryptRounds: 12,
    // Not a secret: the web shows it to every browser. The same client serves
    // production and localhost.
    googleClientId: process.env.GOOGLE_CLIENT_ID,
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY,
    // Resend only sends from a verified domain, which is the product's own.
    fromAddress: `${APP_NAME} <noreply@${APP_DOMAIN}>`,
  },
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN || undefined,
    environment: process.env.NODE_ENV ?? 'development',
  },
  frontendUrl: process.env.FRONTEND_URL,
})
