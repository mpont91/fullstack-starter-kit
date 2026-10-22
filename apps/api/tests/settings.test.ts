import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { settingsSchema } from '../src/domain/types/settings'

const valid = {
  port: '3000',
  corsOrigins: ['http://localhost:4321'],
  auth: {
    jwtSecret: 'secret',
    jwtExpiresIn: '7d',
    bcryptRounds: 4,
    googleClientId: 'client.apps.googleusercontent.com',
  },
  email: { resendApiKey: 'fake-key', fromAddress: 'App <noreply@example.com>' },
  monitoring: { environment: 'test' },
  frontendUrl: 'http://localhost:4321',
}

describe('settingsSchema', () => {
  it('coerces the port from the environment string', () => {
    assert.equal(settingsSchema.parse(valid).port, 3000)
  })

  it('requires at least one CORS origin', () => {
    assert.throws(() => settingsSchema.parse({ ...valid, corsOrigins: [] }))
  })

  it('refuses to boot without the frontend URL', () => {
    assert.throws(() =>
      settingsSchema.parse({ ...valid, frontendUrl: undefined }),
    )
  })

  it('refuses to boot without the JWT secret', () => {
    assert.throws(() =>
      settingsSchema.parse({
        ...valid,
        auth: { ...valid.auth, jwtSecret: '' },
      }),
    )
  })
})
