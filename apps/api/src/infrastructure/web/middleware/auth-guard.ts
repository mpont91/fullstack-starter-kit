import { Request, Response, NextFunction } from 'express'
import { AuthenticateUseCase } from '../../../application/authenticate-use-case'
import { UnauthorizedError } from '../../../domain/errors/auth-error'
import { asyncHandler } from './async-handler'

// Async because a logged-out token is only known to the database, so the
// rejection has to be routed to the error middleware like any handler's.
export const authGuard = (authenticate: AuthenticateUseCase) => {
  return asyncHandler(
    async (
      request: Request,
      _response: Response,
      next: NextFunction,
    ): Promise<void> => {
      const header = request.headers.authorization

      if (!header?.startsWith('Bearer ')) {
        throw new UnauthorizedError('Missing or malformed Authorization header')
      }

      const token = await authenticate.execute(header.slice('Bearer '.length))

      request.userId = token.userId
      request.token = token
      next()
    },
  )
}
