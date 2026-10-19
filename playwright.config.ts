import path from 'node:path'
import dotenv from 'dotenv'
import { defineConfig, devices } from '@playwright/test'

// Test-only ports and database (server/.env.test), kept separate from the dev servers and dev DB
dotenv.config({ path: path.resolve(__dirname, 'server/.env.test') })

const apiPort = process.env.PORT ?? '3001'
const clientPort = '5174'
const baseURL = `http://localhost:${clientPort}`

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/test-results',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: './e2e/playwright-report' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // Resets and seeds the test database, then starts the API
      name: 'API',
      command: 'bun run --cwd server test:serve',
      url: `http://localhost:${apiPort}/api/health`,
      timeout: 120_000,
      // Never reuse: a running server could be pointed at the dev database
      reuseExistingServer: false,
      stdout: 'pipe',
    },
    {
      name: 'Client',
      command: `bun run --cwd client dev --port ${clientPort} --strictPort`,
      url: baseURL,
      env: { API_URL: `http://localhost:${apiPort}` },
      reuseExistingServer: false,
    },
  ],
})
