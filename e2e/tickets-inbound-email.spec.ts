import type { Page } from '@playwright/test'
import { expect, test } from './fixtures/auth'

const WEBHOOK_URL = '/api/webhooks/inbound-email'
const SECRET = process.env.INBOUND_EMAIL_SECRET ?? 'test-inbound-secret-123'

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function makeEmail(overrides: Record<string, unknown> = {}) {
  const suffix = uniqueSuffix()
  return {
    senderName: `Customer ${suffix}`,
    senderEmail: `customer-${suffix}@example.com`,
    subject: `Printer on fire ${suffix}`,
    text: 'Please help, the printer is smoking.',
    messageId: `<msg-${suffix}@mail.example.com>`,
    ...overrides,
  }
}

async function expectTicketRow(page: Page, email: { subject: unknown; senderName: unknown; senderEmail: unknown }) {
  // Agents default to "My tickets"; new inbound tickets are unassigned, so show all
  await page.goto('/tickets?assignee=all')
  const row = page.getByRole('row').filter({ hasText: String(email.subject) })
  await expect(row).toHaveCount(1)
  await expect(row.getByText(String(email.subject))).toBeVisible()
  await expect(row.getByText(String(email.senderName))).toBeVisible()
  await expect(row.getByText(String(email.senderEmail))).toBeVisible()
  await expect(row.getByText('Open', { exact: true })).toBeVisible()
}

test.describe('inbound email webhook', () => {
  test('a posted email creates a ticket the agent and admin can see', async ({
    request,
    agentPage,
    adminPage,
  }) => {
    const email = makeEmail()
    const res = await request.post(WEBHOOK_URL, { headers: { 'x-webhook-secret': SECRET }, data: email })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(typeof body.ticket.id).toBe('number')

    await expectTicketRow(agentPage, email)
    await expectTicketRow(adminPage, email)
  })

  test('posting the same messageId twice returns the same ticket without a duplicate', async ({
    request,
    agentPage,
  }) => {
    const email = makeEmail()
    const headers = { 'x-webhook-secret': SECRET }

    const first = await request.post(WEBHOOK_URL, { headers, data: email })
    expect(first.status()).toBe(201)
    const firstId = (await first.json()).ticket.id

    const second = await request.post(WEBHOOK_URL, { headers, data: email })
    expect(second.status()).toBe(200)
    expect((await second.json()).ticket.id).toBe(firstId)

    await agentPage.goto('/tickets?assignee=all')
    await expect(agentPage.getByRole('row').filter({ hasText: email.subject })).toHaveCount(1)
  })

  test('a wrong secret is rejected with 401 and creates no ticket', async ({ request, agentPage }) => {
    const email = makeEmail()
    const res = await request.post(WEBHOOK_URL, {
      headers: { 'x-webhook-secret': 'definitely-wrong-secret' },
      data: email,
    })
    expect(res.status()).toBe(401)

    await agentPage.goto('/tickets?assignee=all')
    await expect(agentPage.getByRole('columnheader', { name: 'Subject' })).toBeVisible()
    await expect(agentPage.getByRole('row').filter({ hasText: email.subject })).toHaveCount(0)
  })

  test('a missing secret is rejected with 401', async ({ request }) => {
    const res = await request.post(WEBHOOK_URL, { data: makeEmail() })
    expect(res.status()).toBe(401)
  })

  test('a body without senderName is rejected with 400', async ({ request }) => {
    const { senderName: _omit, ...invalid } = makeEmail()
    const res = await request.post(WEBHOOK_URL, { headers: { 'x-webhook-secret': SECRET }, data: invalid })
    expect(res.status()).toBe(400)
  })
})
