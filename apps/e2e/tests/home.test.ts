import { expect, test } from './fixtures'

test.describe('signed out', () => {
  test.use({ signedIn: false })

  test('the home presents the template and links to its code', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { level: 1, name: /not on the groundwork/ }),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Backups' })).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'See the code' }),
    ).toHaveAttribute('href', 'https://github.com/mpont91/unagistart')

    await page.getByRole('link', { name: 'Try it' }).click()
    await expect(page).toHaveURL(/\/register\/?$/)
  })
})

test('the first screen after logging in points to the profile', async ({
  page,
}) => {
  await page.goto('/app')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Welcome' }),
  ).toBeVisible()
  await expect(page.getByText('Your account is ready')).toBeVisible()

  await page.getByRole('link', { name: 'Go to your profile' }).click()
  await expect(page).toHaveURL(/\/app\/profile\/?$/)
})
