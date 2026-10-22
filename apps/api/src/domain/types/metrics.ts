import { z } from 'zod'

export const weeklyMetricsRecordSchema = z.object({
  weekStart: z.date(),
  signUps: z.number().int(),
  verified: z.number().int(),
})

export type WeeklyMetricsRecord = z.infer<typeof weeklyMetricsRecordSchema>
