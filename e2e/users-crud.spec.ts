import type { Page } from '@playwright/test'
import { expect, login, test } from './fixtures/auth'
import { ADMIN } from './helpers/users'

const PASSWORD = 'pass1234' // the password must be exactly 8 characters

function uniqueUser(label: string) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return { name: `${label} ${id}`, email: `${label.toLowerCase()}-${id}@test.example`, password: PASSWORD }
}

// Creates a user through the New user dialog and waits for the row to appear
async function createUser(page: Page, user: { name: string; email: string; password: string }) {
  await page.getByRole('button', { name: 'New user' }).click()
  const dialog = page.getByRole('dialog', { name: 'New user' })
  await dialog.getByLabel('Name').fill(user.name)
  await dialog.getByLabel('Email').fill(user.email)
  await dialog.getByLabel('Password').fill(user.password)
  await dialog.getByRole('button', { name: 'Create user' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('row', { name: new RegExp(user.email) })).toBeVisible()
}

test.describe('admin user management', () => {
  test.beforeEach(async ({ adminPage: page }) => {
    await page.goto('/users')
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  })

  test('read: users table lists the seeded admin with its columns', async ({ adminPage: page }) => {
    for (const name of ['Name', 'Email', 'Role', 'Created']) {
      await expect(page.getByRole('columnheader', { name })).toBeVisible()
    }
    const row = page.getByRole('row', { name: new RegExp(ADMIN.email) })
    await expect(row.getByRole('cell', { name: ADMIN.name, exact: true })).toBeVisible()
    await expect(row.getByRole('cell', { name: 'ADMIN', exact: true })).toBeVisible()
  })

  test('create: new user appears in the table with the AGENT role', async ({ adminPage: page }) => {
    const user = uniqueUser('Created')
    await createUser(page, user)
    const row = page.getByRole('row', { name: new RegExp(user.email) })
    await expect(row.getByRole('cell', { name: user.name, exact: true })).toBeVisible()
    await expect(row.getByRole('cell', { name: 'AGENT' })).toBeVisible()
  })

  test('update: editing the name shows the new name and keeps the password', async ({
    adminPage: page,
    browser,
  }) => {
    const user = uniqueUser('Rename')
    await createUser(page, user)

    await page.getByRole('button', { name: `Edit ${user.name}` }).click()
    const dialog = page.getByRole('dialog', { name: 'Edit user' })
    await expect(dialog.getByLabel('Name')).toHaveValue(user.name)
    await expect(dialog.getByLabel('Email')).toHaveValue(user.email)
    await expect(dialog.getByLabel('Password')).toHaveValue('')

    const newName = `${user.name} Renamed`
    await dialog.getByLabel('Name').fill(newName)
    await dialog.getByRole('button', { name: 'Save changes' }).click()
    await expect(dialog).toBeHidden()

    const row = page.getByRole('row', { name: new RegExp(user.email) })
    await expect(row.getByRole('cell', { name: newName, exact: true })).toBeVisible()

    // The blank password left the original one in place
    const context = await browser.newContext()
    await login(await context.newPage(), user)
    await context.close()
  })

  test('update: a new password lets the user sign in with it', async ({ adminPage: page, browser }) => {
    const user = uniqueUser('Repass')
    await createUser(page, user)

    await page.getByRole('button', { name: `Edit ${user.name}` }).click()
    const dialog = page.getByRole('dialog', { name: 'Edit user' })
    const newPassword = 'newpass9' // the password must be exactly 8 characters
    await dialog.getByLabel('Password').fill(newPassword)
    await dialog.getByRole('button', { name: 'Save changes' }).click()
    await expect(dialog).toBeHidden()

    const context = await browser.newContext()
    await login(await context.newPage(), { email: user.email, password: newPassword })
    await context.close()
  })

  test('delete: confirming removes the agent row and blocks sign-in', async ({ adminPage: page, browser }) => {
    const user = uniqueUser('Doomed')
    await createUser(page, user)

    await page.getByRole('button', { name: `Delete ${user.name}` }).click()
    const dialog = page.getByRole('dialog', { name: 'Delete user' })
    await expect(dialog).toContainText(user.email)
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByRole('row', { name: new RegExp(user.email) })).toHaveCount(0)

    const context = await browser.newContext()
    const other = await context.newPage()
    await other.goto('/login')
    await other.getByLabel('Email').fill(user.email)
    await other.getByLabel('Password').fill(user.password)
    await other.getByRole('button', { name: 'Sign in' }).click()
    await expect(other).toHaveURL(/\/login$/)
    await expect(other.getByRole('button', { name: 'Sign out' })).toHaveCount(0)
    await context.close()
  })

  test('delete: admin rows have no delete button', async ({ adminPage: page }) => {
    const row = page.getByRole('row', { name: new RegExp(ADMIN.email) })
    await expect(row.getByRole('button', { name: `Edit ${ADMIN.name}` })).toBeVisible()
    await expect(row.getByRole('button', { name: /^Delete/ })).toHaveCount(0)
  })
})
