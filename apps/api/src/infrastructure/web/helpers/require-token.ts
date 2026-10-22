import { Request } from 'express'
import { UnauthorizedError } from '../../../domain/errors/auth-error'
import { VerifiedToken } from '../../../domain/types/auth'

export const requireToken = (request: Request): VerifiedToken => {
  if (!request.token) {
    throw new UnauthorizedError()
  }
  return request.token
}
