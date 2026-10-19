import { expect, test, type Page } from '@playwright/test'
import { ADMIN } from './helpers/users'

async function fill(page: Page, email: string, password: string) {
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test.describe('login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('admin signs in and lands on home with name and Sign out in the nav', async ({ page }) => {
    await fill(page, ADMIN.email, ADMIN.password)
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()
    await expect(page.getByText(ADMIN.name, { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
  })

  test('wrong password shows an error and stays on /login', async ({ page }) => {
    await fill(page, ADMIN.email, 'wrong-password-123456')
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('unknown email shows an error and stays on /login', async ({ page }) => {
    await fill(page, 'nobody@test.example', 'some-password-123456')
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('error message is identical for unknown email and wrong password', async ({ page }) => {
    await fill(page, 'nobody@test.example', 'some-password-123456')
    await expect(page.getByRole('alert')).toBeVisible()
    const unknown = await page.getByRole('alert').innerText()
    await page.reload()
    await fill(page, ADMIN.email, 'wrong-password-123456')
    await expect(page.getByRole('alert')).toBeVisible()
    expect(await page.getByRole('alert').innerText()).toBe(unknown)
    expect(unknown.toLowerCase()).not.toMatch(/not found|no user|exist|register/)
  })

  test('empty form shows required messages and sends no request', async ({ page }) => {
    let called = false
    await page.route('**/api/auth/sign-in/**', (route) => {
      called = true
      return route.continue()
    })
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByText('Email is required')).toBeVisible()
    await expect(page.getByText('Password is required')).toBeVisible()
    expect(called).toBe(false)
  })

  test('invalid email format is rejected client-side', async ({ page }) => {
    await fill(page, 'not-an-email', ADMIN.password)
    await expect(page.getByText('Enter a valid email address')).toBeVisible()
    await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  test('missing password only shows the password message', async ({ page }) => {
    await fill(page, ADMIN.email, '')
    await expect(page.getByText('Password is required')).toBeVisible()
    await expect(page.getByText('Email is required')).toHaveCount(0)
  })

  test('password shorter than the minimum (12) is rejected by the server', async ({ page }) => {
    await fill(page, ADMIN.email, 'short')
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('password longer than the maximum (128) is rejected by the server', async ({ page }) => {
    await fill(page, ADMIN.email, 'a'.repeat(129))
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('email is case-insensitive', async ({ page }) => {
    await fill(page, ADMIN.email.toUpperCase(), ADMIN.password)
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
  })

  test('surrounding whitespace in the email does not break sign-in', async ({ page }) => {
    // type=email inputs strip leading/trailing whitespace on value sanitization
    await fill(page, `  ${ADMIN.email}  `, ADMIN.password)
    await expect(page).toHaveURL('/')
  })

  test('surrounding whitespace in the password is not trimmed', async ({ page }) => {
    await fill(page, ADMIN.email, ` ${ADMIN.password} `)
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('form can be resubmitted successfully after a failure', async ({ page }) => {
    await fill(page, ADMIN.email, 'wrong-password-123456')
    await expect(page.getByRole('alert')).toBeVisible()
    await page.getByLabel('Password').fill(ADMIN.password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL('/')
  })

  test('submit button is disabled and relabelled while the request is pending', async ({ page }) => {
    await page.route('**/api/auth/sign-in/email', async (route) => {
      await new Promise((r) => setTimeout(r, 1000))
      await route.continue()
    })
    await fill(page, ADMIN.email, ADMIN.password)
    await expect(page.getByRole('button', { name: 'Signing in...' })).toBeDisabled()
    await expect(page).toHaveURL('/')
  })

  test('network failure keeps the user on /login with the form usable', async ({ page }) => {
    await page.route('**/api/auth/sign-in/email', (route) => route.abort())
    await fill(page, ADMIN.email, ADMIN.password)
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled()
  })
})
