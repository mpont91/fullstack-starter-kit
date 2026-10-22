import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { APP_NAME } from '@app/shared'
import {
  passwordResetEmail,
  welcomeEmail,
} from '../src/infrastructure/email/email-templates'

describe('welcome email', () => {
  const url = 'https://web.test/es/verify-email?token=abc'

  it('is written in the user language and carries the link', () => {
    const email = welcomeEmail(url, 'ES')

    assert.equal(email.subject, `Bienvenido a ${APP_NAME}`)
    assert.ok(email.html.includes(`href="${url}"`))
    assert.ok(email.html.includes('<html lang="es">'))
  })

  it('takes its logo from the web the link points to, as a PNG', () => {
    assert.ok(
      welcomeEmail(url, 'EN').html.includes(
        'src="https://web.test/apple-touch-icon.png"',
      ),
    )
  })
})

describe('password reset email', () => {
  it('names the product and carries the link', () => {
    const url = 'https://web.test/reset-password?token=abc'
    const email = passwordResetEmail(url, 'EN')

    assert.equal(email.subject, `Reset your ${APP_NAME} password`)
    assert.ok(email.html.includes(`href="${url}"`))
  })
})
