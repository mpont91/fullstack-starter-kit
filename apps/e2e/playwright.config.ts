import { defineConfig, devices } from '@playwright/test'

// Ports of their own, so the suite runs while `make dev` does.
const API_PORT = Number(process.env.E2E_API_PORT ?? 3001)
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 4322)
export const API_URL = `http://localhost:${API_PORT}`
const WEB_URL = `http://localhost:${WEB_PORT}`

export default defineConfig({
  testDir: 'tests',
  testMatch: '**/*.test.ts',
  // Each test has an account of its own, so they run side by side.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  // The real API on its own database, with what's outside it faked
  // (apps/api/tests/e2e/server.ts); and the web built as it's deployed,
  // pointed at it, with no monitoring. `--ignore-lock` keeps the preview in
  // the foreground, where Playwright can stop it, even when Astro thinks an
  // agent started it, and alongside another preview.
  webServer: [
    {
      command: 'make -C ../api e2e-server',
      url: `${API_URL}/uptime`,
      env: {
        E2E_API_PORT: String(API_PORT),
        E2E_WEB_URL: WEB_URL,
      },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npx astro build && npx astro preview --port ${WEB_PORT} --ignore-lock`,
      cwd: '../web',
      url: WEB_URL,
      env: {
        PUBLIC_API_URL: `${API_URL}/`,
        PUBLIC_SENTRY_DSN: '',
      },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
