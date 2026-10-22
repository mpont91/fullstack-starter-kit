import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { APP_SLUG, STORAGE_PREFIX } from '../src/brand.js'

describe('brand', () => {
  it('keeps the slug safe for machine identifiers', () => {
    assert.match(APP_SLUG, /^[a-z0-9-]+$/)
  })

  it('prefixes storage keys with the slug', () => {
    assert.equal(STORAGE_PREFIX, APP_SLUG)
  })
})
