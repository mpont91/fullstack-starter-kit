import { Request } from 'express'
import { UnauthorizedError } from '../../../domain/errors/auth-error'

export const requireUserId = (request: Request): string => {
  if (!request.userId) {
    throw new UnauthorizedError()
  }
  return request.userId
}
