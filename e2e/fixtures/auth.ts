import { expect, test as base, type Page } from '@playwright/test'
import { ADMIN, AGENT, ensureAgent } from '../helpers/users'

export async function login(page: Page, user: { email: string; password: string }) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
}

type Fixtures = { adminPage: Page; agentPage: Page }

// Each test gets a fresh, already signed-in context for the role it needs
export const test = base.extend<Fixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await login(page, ADMIN)
    await use(page)
    await context.close()
  },
  agentPage: async ({ browser }, use) => {
    ensureAgent()
    const context = await browser.newContext()
    const page = await context.newPage()
    await login(page, AGENT)
    await use(page)
    await context.close()
  },
})

export { expect }
