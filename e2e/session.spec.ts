import { expect, test } from './fixtures/auth'
import { ADMIN, AGENT } from './helpers/users'

test.describe('signed-out access', () => {
  for (const route of ['/', '/users']) {
    test(`visiting ${route} redirects to /login`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/\/login$/)
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    })
  }
})

test.describe('session', () => {
  test('session persists across reload', async ({ adminPage: page }) => {
    await page.reload()
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
  })

  test('session is shared by a new tab in the same context', async ({ adminPage: page }) => {
    const tab = await page.context().newPage()
    await tab.goto('/')
    await expect(tab.getByRole('button', { name: 'Sign out' })).toBeVisible()
  })

  test('signed-in visitor to /login is redirected to /', async ({ adminPage: page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()
  })

  test('session cookie is HttpOnly', async ({ adminPage: page }) => {
    const cookies = await page.context().cookies()
    const session = cookies.find((c) => c.name.includes('session_token'))
    expect(session).toBeDefined()
    expect(session!.httpOnly).toBe(true)
    expect(session!.sameSite).toBe('Lax')
  })

  test('JavaScript cannot read the session cookie', async ({ adminPage: page }) => {
    const visible = await page.evaluate(() => document.cookie)
    expect(visible).not.toContain('session_token')
  })

  test('sign out redirects to /login and clears the session cookie', async ({ adminPage: page }) => {
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/login$/)
    const cookies = await page.context().cookies()
    expect(cookies.find((c) => c.name.includes('session_token') && c.value !== '')).toBeUndefined()
  })

  test('after sign out, reload stays on /login', async ({ adminPage: page }) => {
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await page.reload()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('after sign out, back navigation cannot reach protected pages', async ({ adminPage: page }) => {
    // Build real history first: / then /users, so back lands on a protected page, not about:blank
    await page.goto('/')
    await page.goto('/users')
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await page.goBack()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('button', { name: 'Sign out' })).toHaveCount(0)
  })

  test('after sign out, direct navigation to /users redirects to /login', async ({ adminPage: page }) => {
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await page.goto('/users')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('signing out invalidates the old session token on the server', async ({ adminPage: page, browser }) => {
    const before = (await page.context().cookies()).find((c) => c.name.includes('session_token'))!
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/login$/)
    // Replay the old cookie in a fresh context: the server must not accept it
    const fresh = await browser.newContext()
    await fresh.addCookies([{ ...before, expires: -1 }])
    const res = await fresh.request.get('/api/auth/get-session')
    expect(await res.json()).toBeNull()
    await fresh.close()
  })

  test('signing out one user does not affect another context', async ({ adminPage, agentPage }) => {
    await adminPage.getByRole('button', { name: 'Sign out' }).click()
    await expect(adminPage).toHaveURL(/\/login$/)
    await agentPage.reload()
    await expect(agentPage.getByText(AGENT.name, { exact: true })).toBeVisible()
  })

  test('nav shows the signed-in user name', async ({ adminPage: page }) => {
    await expect(page.getByText(ADMIN.name, { exact: true })).toBeVisible()
  })
})
