import { AdminUserListQuery, AdminUserPage } from '@app/shared'
import { UserRepository } from '../domain/ports/user-repository'
import { toAdminUserSummary } from '../domain/mappers/user-mapper'

export class ListUsersUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(query: AdminUserListQuery): Promise<AdminUserPage> {
    const { records, total } = await this.users.list(
      query.search || undefined,
      (query.page - 1) * query.pageSize,
      query.pageSize,
    )
    return { items: records.map(toAdminUserSummary), total }
  }
}
