import { z } from 'zod'

export const adminActionTypeSchema = z.enum(['DELETE_USER'])

export type AdminActionType = z.infer<typeof adminActionTypeSchema>
