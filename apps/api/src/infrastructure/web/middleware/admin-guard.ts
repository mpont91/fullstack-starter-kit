import { Request, Response, NextFunction } from 'express'
import { AuthorizeAdminUseCase } from '../../../application/authorize-admin-use-case'
import { requireUserId } from '../helpers/require-user-id'
import { asyncHandler } from './async-handler'

// Runs after the auth guard: that one says who the user is, this one whether
// they may use the admin endpoints.
export const adminGuard = (authorizeAdmin: AuthorizeAdminUseCase) => {
  return asyncHandler(
    async (
      request: Request,
      _response: Response,
      next: NextFunction,
    ): Promise<void> => {
      await authorizeAdmin.execute(requireUserId(request))
      next()
    },
  )
}
