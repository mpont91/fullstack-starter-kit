import { NextFunction, Request, RequestHandler, Response } from 'express'
import { rateLimit } from 'express-rate-limit'
import { TooManyAttemptsError } from '../../../domain/errors/auth-error'

const MINUTE = 60 * 1000

// Counted per IP, in memory: there is one API process, and a restart only
// gives an attacker a fresh window, not a way around it. The rejection goes
// through the error middleware like any other, so it keeps the envelope.
const limit = (
  windowMs: number,
  limit: number,
  skipSuccessfulRequests: boolean,
): RequestHandler =>
  rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_request: Request, _response: Response, next: NextFunction) =>
      next(new TooManyAttemptsError()),
  })

// Only failed logins count, so someone who types their password right is never
// locked out by their own earlier typos.
export const loginRateLimit = (): RequestHandler => limit(15 * MINUTE, 10, true)

// Every sign-up counts, successful or not: creating accounts in bulk is what
// this stops.
export const registerRateLimit = (): RequestHandler =>
  limit(60 * MINUTE, 5, false)

// For routes that send an email to whatever address they're given. Every
// request counts: what this stops is flooding someone's inbox, and spending
// the sending quota, from one connection.
export const emailRateLimit = (): RequestHandler => limit(60 * MINUTE, 5, false)
