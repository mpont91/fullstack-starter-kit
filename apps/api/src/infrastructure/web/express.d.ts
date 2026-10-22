import { VerifiedToken } from '../../domain/types/auth'

declare global {
  namespace Express {
    interface Request {
      userId?: string
      token?: VerifiedToken
    }
  }
}

export {}
