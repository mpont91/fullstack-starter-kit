import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { NextFunction, Request, Response } from 'express'
import { errorHandler } from '../src/infrastructure/web/middleware/error-handler'
import { FakeErrorReporter } from './helpers/fake-error-reporter'

const handle = (error: Error, userId?: string) => {
  const errorReporter = new FakeErrorReporter()
  const sent: { status?: number; body?: unknown } = {}
  const response = {
    status(code: number) {
      sent.status = code
      return this
    },
    json(body: unknown) {
      sent.body = body
      return this
    },
  }
  errorHandler(errorReporter)(
    error,
    { userId } as Request,
    response as unknown as Response,
    (() => {}) as NextFunction,
  )
  return { sent, reports: errorReporter.reports }
}

describe('the error handler', () => {
  it('reports an unexpected error as a 500, with the user id', () => {
    const { sent, reports } = handle(new Error('database down'), 'user-1')

    assert.equal(sent.status, 500)
    assert.deepEqual(sent.body, { error: 'Internal Server Error' })
    assert.equal(reports.length, 1)
    assert.equal(reports[0].where, 'http')
    assert.equal(reports[0].userId, 'user-1')
  })

  it("answers the body parser's 4xx with their status, unreported", () => {
    const malformed = Object.assign(new SyntaxError('Unexpected token'), {
      status: 400,
    })
    const tooLarge = Object.assign(new Error('request entity too large'), {
      status: 413,
    })

    const first = handle(malformed)
    const second = handle(tooLarge)

    assert.equal(first.sent.status, 400)
    assert.deepEqual(first.sent.body, {
      error: 'Bad Request',
      details: 'Unexpected token',
    })
    assert.equal(second.sent.status, 413)
    assert.deepEqual(first.reports, [])
    assert.deepEqual(second.reports, [])
  })
})
