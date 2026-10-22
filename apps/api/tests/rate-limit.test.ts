import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import express, { Request, Response } from 'express'
import {
  emailRateLimit,
  loginRateLimit,
  registerRateLimit,
} from '../src/infrastructure/web/middleware/rate-limit'
import { errorHandler } from '../src/infrastructure/web/middleware/error-handler'
import { FakeErrorReporter } from './helpers/fake-error-reporter'

// A stand-in for the real endpoints: the body says whether this attempt
// "succeeds", which is all the limiter looks at.
const app = express()
app.use(express.json())
const outcome = (request: Request, response: Response): void => {
  response.status(request.body.ok ? 200 : 401).json({})
}
app.post('/login', loginRateLimit(), outcome)
app.post('/register', registerRateLimit(), outcome)
app.post('/email', emailRateLimit(), outcome)
app.use(errorHandler(new FakeErrorReporter()))

let server: Server
let base: string

before(async () => {
  server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

after(() => server.close())

const attempt = (path: string, ok: boolean): Promise<globalThis.Response> =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok }),
  })

describe('login rate limit', () => {
  it('does not count successful logins', async () => {
    for (let i = 0; i < 15; i++) {
      assert.equal((await attempt('/login', true)).status, 200)
    }
  })

  it('refuses the 11th failed attempt with the error envelope', async () => {
    for (let i = 0; i < 10; i++) {
      assert.equal((await attempt('/login', false)).status, 401)
    }

    const blocked = await attempt('/login', false)
    assert.equal(blocked.status, 429)
    assert.deepEqual(await blocked.json(), {
      error: 'Too Many Requests',
      details: 'Too many attempts, try again later',
    })
    // Once blocked, even the right password waits out the window.
    assert.equal((await attempt('/login', true)).status, 429)
  })
})

describe('register rate limit', () => {
  it('counts every sign-up and refuses the 6th', async () => {
    for (let i = 0; i < 5; i++) {
      assert.equal((await attempt('/register', true)).status, 200)
    }
    assert.equal((await attempt('/register', true)).status, 429)
  })
})

describe('email rate limit', () => {
  it('counts every request and refuses the 6th', async () => {
    for (let i = 0; i < 5; i++) {
      assert.equal((await attempt('/email', true)).status, 200)
    }
    assert.equal((await attempt('/email', true)).status, 429)
  })
})
