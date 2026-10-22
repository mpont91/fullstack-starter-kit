import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isAppPath, needsSession } from '../src/helpers/app-path-helper'

describe('app paths', () => {
  it('recognizes the app home and the pages under it', () => {
    assert.equal(isAppPath('/app'), true)
    assert.equal(isAppPath('/app/'), true)
    assert.equal(isAppPath('/app/profile'), true)
    assert.equal(isAppPath('/app/profile/'), true)
  })

  it('recognizes them under a language prefix', () => {
    assert.equal(isAppPath('/es/app'), true)
    assert.equal(isAppPath('/es/app/profile/'), true)
  })

  it('leaves the public site out', () => {
    assert.equal(isAppPath('/'), false)
    assert.equal(isAppPath('/es'), false)
    assert.equal(isAppPath('/login'), false)
    assert.equal(isAppPath('/es/login/'), false)
    assert.equal(isAppPath('/apple'), false)
  })

  it('asks for a session in the app and in the admin area only', () => {
    assert.equal(needsSession('/app/profile'), true)
    assert.equal(needsSession('/admin'), true)
    assert.equal(needsSession('/es/admin/'), true)
    assert.equal(isAppPath('/admin'), false)
    assert.equal(needsSession('/pricing'), false)
    assert.equal(needsSession('/administrator'), false)
  })
})
