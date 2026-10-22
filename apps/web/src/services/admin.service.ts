// Admin service. Talks to the API's /admin endpoints, which answer 403 to
// anyone without the admin role — hiding the panel's link is only cosmetic.

import {
  adminMetricsSchema,
  adminUserPageSchema,
  messageSchema,
} from '@app/shared'
import type { AdminMetrics, AdminUserPage } from '@app/shared'
import { apiRequest } from './api-client'

export async function listUsers(params: {
  search?: string
  page: number
  pageSize: number
}): Promise<AdminUserPage> {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  })
  if (params.search) query.set('search', params.search)
  return apiRequest(`/admin/users?${query.toString()}`, adminUserPageSchema, {
    auth: true,
  })
}

export async function getMetrics(): Promise<AdminMetrics> {
  return apiRequest('/admin/metrics', adminMetricsSchema, { auth: true })
}

export async function deleteUser(userId: string): Promise<void> {
  await apiRequest(
    `/admin/users/${encodeURIComponent(userId)}`,
    messageSchema,
    { method: 'DELETE', auth: true },
  )
}
