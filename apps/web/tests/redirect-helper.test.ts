import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { afterLoginPath } from '../src/helpers/redirect-helper'

describe('afterLoginPath', () => {
  it("lands on the app's home in the page language", () => {
    assert.equal(afterLoginPath('', 'en', 'en'), '/app')
    assert.equal(afterLoginPath('', 'es', 'es'), '/es/app')
  })

  it('goes back to the page that asked for the login', () => {
    const search = `?redirect=${encodeURIComponent('/es/app/profile')}`
    assert.equal(afterLoginPath(search, 'es', 'es'), '/es/app/profile')
  })

  it("switches to the user's own language when it differs", () => {
    assert.equal(afterLoginPath('', 'en', 'es'), '/es/app')
    const search = `?redirect=${encodeURIComponent('/es/app/profile')}`
    assert.equal(afterLoginPath(search, 'es', 'en'), '/app/profile')
  })
})
