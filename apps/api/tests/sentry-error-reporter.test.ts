import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { scrubEvent } from '../src/infrastructure/monitoring/sentry-error-reporter'

describe('scrubEvent', () => {
  it('keeps the error, the method, the path and the user id only', () => {
    const scrubbed = scrubEvent({
      type: undefined,
      exception: { values: [{ type: 'Error', value: 'boom' }] },
      tags: { where: 'http' },
      request: {
        method: 'POST',
        url: 'https://api.example.com/notes?token=secret',
        headers: { authorization: 'Bearer secret' },
        data: { note: 'private', email: 'alice@example.com' },
        query_string: 'token=secret',
        cookies: { session: 'secret' },
      },
      user: { id: 'user-1', email: 'alice@example.com', ip_address: '1.2.3.4' },
      breadcrumbs: [{ category: 'console', message: 'alice@example.com' }],
    })

    assert.deepEqual(scrubbed, {
      type: undefined,
      exception: { values: [{ type: 'Error', value: 'boom' }] },
      tags: { where: 'http' },
      request: { method: 'POST', url: 'https://api.example.com/notes' },
      user: { id: 'user-1' },
    })
  })

  it('adds no request or user when the event had none', () => {
    const scrubbed = scrubEvent({ type: undefined, message: 'boom' })

    assert.deepEqual(scrubbed, { type: undefined, message: 'boom' })
  })
})
