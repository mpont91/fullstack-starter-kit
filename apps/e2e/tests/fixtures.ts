import { test as base, expect, type Page } from '@playwright/test'
import { STORAGE_PREFIX, authResponseSchema } from '@app/shared'
import { API_URL } from '../playwright.config'

interface Account {
  email: string
  password: string
}

// `account`: a new verified user, for this test alone.
// `page` opens signed in as them, unless the test sets `signedIn: false`.
export const test = base.extend<{ account: Account; signedIn: boolean }>({
  signedIn: [true, { option: true }],
  // Every test comes from an address of its own, as different users would,
  // so the API's limits per address (failed logins, sign-ups) don't add up
  // across the suite. The e2e API trusts one proxy hop to read it.
  // Playwright reads a fixture's dependencies from its first argument, which
  // must be an object pattern even when there are none.
  // eslint-disable-next-line no-empty-pattern
  extraHTTPHeaders: async ({}, use) => {
    const byte = () => Math.floor(Math.random() * 256)
    await use({ 'X-Forwarded-For': `10.${byte()}.${byte()}.${byte()}` })
  },
  account: async ({ request }, use) => {
    const response = await request.post(`${API_URL}/e2e/accounts`)
    expect(response.ok()).toBe(true)
    await use((await response.json()).data)
  },
  page: async ({ page, request, account, signedIn }, use) => {
    // Nothing leaves the machine: Google's sign-in button, for one, would.
    await page.route(
      (url) => url.hostname !== 'localhost',
      (route) => route.abort(),
    )
    if (!signedIn) return use(page)
    const response = await request.post(`${API_URL}/auth/login`, {
      data: account,
    })
    expect(response.ok()).toBe(true)
    const { token, user } = authResponseSchema.parse(
      (await response.json()).data,
    )
    // As the login form leaves it (see apps/web/src/services/session.ts).
    await page.addInitScript(
      ({ prefix, token, user }) => {
        localStorage.setItem(`${prefix}.token`, token)
        localStorage.setItem(`${prefix}.user`, JSON.stringify(user))
      },
      { prefix: STORAGE_PREFIX, token, user },
    )
    await use(page)
  },
})

export { expect }

// Astro renders the islands on the server and Vue takes them over in the
// browser: typing into a form before that is lost when it does.
export async function hydrated(page: Page): Promise<void> {
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0)
}

// Google's script stood in for: its button, "Sign in with Google", signs in
// as `email`, handing the app the credential the e2e API takes as that
// address's Google account (apps/api/tests/e2e/server.ts).
export async function googleAs(page: Page, email: string): Promise<void> {
  await page.route('https://accounts.google.com/gsi/client', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `
        let signedIn
        window.google = { accounts: { id: {
          initialize: (config) => { signedIn = config.callback },
          renderButton: (element) => {
            const button = document.createElement('button')
            button.type = 'button'
            button.textContent = 'Sign in with Google'
            button.onclick = () =>
              signedIn({ credential: 'fake-google:' + ${JSON.stringify(email)} })
            element.append(button)
          },
        } } }
      `,
    }),
  )
}
