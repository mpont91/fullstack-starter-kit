import { expect, test } from './fixtures'

test.use({ signedIn: false })

test('the home opens', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { level: 1, name: /ready from day one/ }),
  ).toBeVisible()
})
