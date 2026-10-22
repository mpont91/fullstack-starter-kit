import { z } from 'zod'
import { isoDateSchema } from './dates.js'
import { roleSchema } from './user.js'

// One row of the admin's user list. Only the account: the admin manages
// accounts, not what anybody keeps in them.
export const adminUserSummarySchema = z.object({
  id: z.string(),
  email: z.string(),
  role: roleSchema,
  createdAt: isoDateSchema,
  emailVerifiedAt: isoDateSchema.nullable(),
  hasPassword: z.boolean(),
  hasGoogle: z.boolean(),
})

export const adminUserPageSchema = z.object({
  items: z.array(adminUserSummarySchema),
  total: z.number().int(),
})

export const adminUserListQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

// Counts only, never a user. Shares are left to the reader, so a week with no
// activity reads as 0 of 0.
export const adminWeeklyMetricsSchema = z.object({
  // Monday, 00:00 UTC.
  weekStart: isoDateSchema,
  signUps: z.number().int(),
  // Of those, the ones that have confirmed their email by now.
  verified: z.number().int(),
})

export const adminMetricsSchema = z.object({
  totalUsers: z.number().int(),
  weeks: z.array(adminWeeklyMetricsSchema),
})

export type AdminUserSummary = z.infer<typeof adminUserSummarySchema>
export type AdminUserPage = z.infer<typeof adminUserPageSchema>
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>
export type AdminWeeklyMetrics = z.infer<typeof adminWeeklyMetricsSchema>
export type AdminMetrics = z.infer<typeof adminMetricsSchema>
