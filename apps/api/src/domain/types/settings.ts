import { z } from 'zod'

export const authSettingsSchema = z.object({
  jwtSecret: z.string().min(1),
  jwtExpiresIn: z.string(),
  bcryptRounds: z.number().int(),
  // The OAuth client the web's Google button belongs to; Google's tokens must
  // be issued to it.
  googleClientId: z.string().min(1),
})

export const emailSettingsSchema = z.object({
  resendApiKey: z.string().min(1),
  fromAddress: z.string().min(1),
})

export const monitoringSettingsSchema = z.object({
  // Optional so development and tests run without reporting anywhere.
  sentryDsn: z.url().optional(),
  environment: z.string(),
})

export const settingsSchema = z.object({
  port: z.coerce.number().int().positive(),
  corsOrigins: z.array(z.string().min(1)).min(1),
  auth: authSettingsSchema,
  email: emailSettingsSchema,
  monitoring: monitoringSettingsSchema,
  // Where the links in emails point: the web, not this API. No default, so a
  // missing value stops the boot instead of mailing links to localhost.
  frontendUrl: z.url(),
})

export type AuthSettings = z.infer<typeof authSettingsSchema>
export type EmailSettings = z.infer<typeof emailSettingsSchema>
export type MonitoringSettings = z.infer<typeof monitoringSettingsSchema>
export type Settings = z.infer<typeof settingsSchema>
