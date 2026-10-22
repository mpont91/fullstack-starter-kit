import { adminUserListQuerySchema } from '@app/shared'
import { Request, Response } from 'express'
import { z } from 'zod'
import { ListUsersUseCase } from '../../../application/list-users-use-case'
import { DeleteUserUseCase } from '../../../application/delete-user-use-case'
import { GetMetricsUseCase } from '../../../application/get-metrics-use-case'
import { requireUserId } from '../helpers/require-user-id'

const idParamSchema = z.object({ id: z.string() })

export class AdminController {
  constructor(
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly getMetricsUseCase: GetMetricsUseCase,
  ) {}

  users = async (request: Request, response: Response): Promise<void> => {
    const query = adminUserListQuerySchema.parse(request.query)
    const data = await this.listUsersUseCase.execute(query)
    response.json({ data })
  }

  metrics = async (_request: Request, response: Response): Promise<void> => {
    const data = await this.getMetricsUseCase.execute()
    response.json({ data })
  }

  deleteUser = async (request: Request, response: Response): Promise<void> => {
    const adminId = requireUserId(request)
    const { id } = idParamSchema.parse(request.params)
    await this.deleteUserUseCase.execute(adminId, id)
    response.json({ data: { message: 'User deleted.' } })
  }
}
