import { randomUUID } from 'node:crypto'
import { expect, googleAs, hydrated, test } from './fixtures'

test.describe('signed out', () => {
  test.use({ signedIn: false })

  test('signs up with Google, with no password', async ({ page }) => {
    await googleAs(page, `e2e-${randomUUID()}@example.com`)
    await page.goto('/register')
    await page.getByRole('button', { name: 'Sign in with Google' }).click()

    await expect(page).toHaveURL(/\/app\/?$/)
    await page.goto('/app/profile')
    await expect(
      page.getByText(
        'You sign in with Google, so your account has no password.',
      ),
    ).toBeVisible()

    // Its deletion is confirmed with Google too.
    await hydrated(page)
    await page.getByRole('button', { name: 'Delete account' }).click()
    await page
      .getByRole('dialog', { name: 'Delete your account?' })
      .getByRole('button', { name: 'Sign in with Google' })
      .click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('logs in with Google to an account made with a password', async ({
    page,
    account,
  }) => {
    await googleAs(page, account.email)
    await page.goto('/login')
    await page.getByRole('button', { name: 'Sign in with Google' }).click()

    await expect(page).toHaveURL(/\/app\/?$/)
    await page.goto('/app/profile')
    await expect(page.getByText(account.email).first()).toBeVisible()
  })
})
