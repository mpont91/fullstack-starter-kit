import { STATUS_CODES } from 'node:http'
import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import {
  EmailAlreadyInUseError,
  EmailNotVerifiedError,
  ForbiddenError,
  IncorrectPasswordError,
  InvalidCredentialsError,
  InvalidOrExpiredResetTokenError,
  InvalidOrExpiredVerificationTokenError,
  TooManyAttemptsError,
  UnauthorizedError,
  UserNotFoundError,
} from '../../../domain/errors/auth-error'
import { ErrorReporter } from '../../../domain/ports/error-reporter'

export const errorHandler =
  (errorReporter: ErrorReporter) =>
  (
    error: Error,
    request: Request,
    response: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction,
  ) => {
    if (error instanceof ZodError) {
      return response.status(400).json({
        error: 'Bad Request',
        details: error.issues,
      })
    }

    if (error.message.startsWith('Invalid Query Params')) {
      return response.status(400).json({
        error: 'Bad Request',
        details: error.message,
      })
    }

    if (
      error instanceof InvalidOrExpiredResetTokenError ||
      error instanceof InvalidOrExpiredVerificationTokenError
    ) {
      return response.status(400).json({
        error: 'Bad Request',
        details: error.message,
      })
    }

    if (error instanceof EmailAlreadyInUseError) {
      return response.status(409).json({
        error: 'Conflict',
        details: error.message,
      })
    }

    if (
      error instanceof InvalidCredentialsError ||
      error instanceof UnauthorizedError
    ) {
      return response.status(401).json({
        error: 'Unauthorized',
        details: error.message,
      })
    }

    if (
      error instanceof IncorrectPasswordError ||
      error instanceof EmailNotVerifiedError ||
      error instanceof ForbiddenError
    ) {
      return response.status(403).json({
        error: 'Forbidden',
        details: error.message,
      })
    }

    if (error instanceof UserNotFoundError) {
      return response.status(404).json({
        error: 'Not Found',
        details: error.message,
      })
    }

    if (error instanceof TooManyAttemptsError) {
      return response.status(429).json({
        error: 'Too Many Requests',
        details: error.message,
      })
    }

    // Express's body parser fails with the status already set: malformed JSON
    // is a 400 and an oversized body a 413. Neither is a fault of ours, and
    // reporting them would bury the real errors under every bot's garbage.
    if (isClientHttpError(error)) {
      return response.status(error.status).json({
        error: STATUS_CODES[error.status],
        details: error.message,
      })
    }

    // Set by the guard, so absent on public routes; not requireUserId, which
    // would throw here.
    errorReporter.report(error, 'http', request.userId)

    return response.status(500).json({
      error: 'Internal Server Error',
    })
  }

const isClientHttpError = (error: Error): error is Error & { status: number } =>
  'status' in error &&
  typeof error.status === 'number' &&
  error.status >= 400 &&
  error.status < 500
