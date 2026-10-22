import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { scrubEvent } from '../src/monitoring/scrub-event'

describe('scrubEvent', () => {
  it('keeps the error, the bare page URL and the user id only', () => {
    const scrubbed = scrubEvent({
      type: undefined,
      exception: { values: [{ type: 'TypeError', value: 'boom' }] },
      request: {
        url: 'https://example.com/es/reset-password?token=secret#top',
        headers: {
          Referer: 'https://example.com/verify-email?token=secret',
          'User-Agent': 'Firefox',
        },
      },
      user: { id: 'user-1', email: 'alice@example.com', ip_address: '1.2.3.4' },
      breadcrumbs: [{ category: 'ui.click', message: 'alice@example.com' }],
    })

    assert.deepEqual(scrubbed, {
      type: undefined,
      exception: { values: [{ type: 'TypeError', value: 'boom' }] },
      request: { url: 'https://example.com/es/reset-password' },
      user: { id: 'user-1' },
    })
  })

  it('adds no request or user when the event had none', () => {
    const scrubbed = scrubEvent({ type: undefined, message: 'boom' })

    assert.deepEqual(scrubbed, { type: undefined, message: 'boom' })
  })
})
