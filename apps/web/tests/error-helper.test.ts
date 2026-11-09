import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { errorMessage, InvalidInput } from '../src/helpers/error-helper'
import { ApiError } from '../src/services/api-error'

const messages = {
  server: 'ours',
  rejected: 'yours',
  byStatus: { 409: 'taken' },
}

describe('errorMessage', () => {
  it('names a status with a precise meaning', () => {
    assert.equal(errorMessage(new ApiError(409, 'x'), messages), 'taken')
  })

  it('tells any other 4xx as a refused input', () => {
    assert.equal(errorMessage(new ApiError(400, 'x'), messages), 'yours')
    assert.equal(errorMessage(new ApiError(404, 'x'), messages), 'yours')
  })

  it('owns a 5xx, a network failure and anything unexpected', () => {
    assert.equal(errorMessage(new ApiError(502, 'x'), messages), 'ours')
    assert.equal(errorMessage(new TypeError('fetch failed'), messages), 'ours')
  })

  it('owns a 4xx too when there is no message for a refused input', () => {
    assert.equal(
      errorMessage(new ApiError(400, 'x'), { server: 'ours' }),
      'ours',
    )
  })

  it("tells a form's own check as it is", () => {
    assert.equal(
      errorMessage(new InvalidInput('too short'), messages),
      'too short',
    )
  })
})
