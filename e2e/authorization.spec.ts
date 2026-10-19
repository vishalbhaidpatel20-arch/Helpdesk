import { expect, test } from './fixtures/auth'

test.describe('admin', () => {
  test('sees the Users link and can open /users', async ({ adminPage: page }) => {
    await page.getByRole('link', { name: 'Users' }).click()
    await expect(page).toHaveURL(/\/users$/)
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  })

  test('can open /users directly and it survives reload', async ({ adminPage: page }) => {
    await page.goto('/users')
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  })
})

test.describe('agent', () => {
  test('does not see the Users link', async ({ agentPage: page }) => {
    await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0)
  })

  test('is redirected from /users to /', async ({ agentPage: page }) => {
    await page.goto('/users')
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Users' })).toHaveCount(0)
  })

  test('session reports the AGENT role', async ({ agentPage: page }) => {
    const res = await page.request.get('/api/auth/get-session')
    const body = await res.json()
    expect(body.user.role).toBe('AGENT')
  })
})
