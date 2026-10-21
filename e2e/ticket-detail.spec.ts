import type { APIRequestContext } from '@playwright/test'
import { TicketCategory, TicketStatus } from '../core/src/schemas/ticket'
import { expect, test } from './fixtures/auth'
import { AGENT } from './helpers/users'

const WEBHOOK_URL = '/api/webhooks/inbound-email'
const SECRET = process.env.INBOUND_EMAIL_SECRET ?? 'test-inbound-secret-123'

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function createTicket(request: APIRequestContext) {
  const suffix = uniqueSuffix()
  const ticket = {
    senderName: `Detail Sender ${suffix}`,
    senderEmail: `detail-${suffix}@example.com`,
    subject: `Detail subject ${suffix}`,
    text: `Detail body ${suffix}\nsecond line <b>not html</b>`,
  }
  const res = await request.post(WEBHOOK_URL, {
    headers: { 'x-webhook-secret': SECRET },
    data: { ...ticket, messageId: `<detail-${suffix}@mail.example.com>` },
  })
  expect(res.status()).toBe(201)
  const { ticket: created } = await res.json()
  return { id: created.id as number, ...ticket }
}

// UI-only behaviour is covered by the component tests (TicketDetail, ReplyThread, ReplyForm,
// TicketDetailPage). These tests cover what needs the real server, database and session.
test.describe('ticket detail page', () => {
  test('shows the sender, subject and body of an inbound-email ticket as plain text', async ({
    request,
    agentPage,
  }) => {
    const t = await createTicket(request)
    await agentPage.goto(`/tickets/${t.id}`)

    await expect(agentPage.getByRole('heading', { name: `Ticket #${t.id}` })).toBeVisible()
    await expect(agentPage.getByText(`${t.senderName} (${t.senderEmail})`)).toBeVisible()
    await expect(agentPage.getByText(t.subject)).toBeVisible()
    await expect(agentPage.getByText(`Detail body`)).toContainText('<b>not html</b>')
    await expect(agentPage.getByLabel('Status')).toHaveValue(TicketStatus.OPEN)
    await expect(agentPage.getByLabel('Assigned to')).toHaveValue('')
  })

  test('assignee, status and category changes persist after reload', async ({ request, agentPage }) => {
    const t = await createTicket(request)
    await agentPage.goto(`/tickets/${t.id}`)

    const status = agentPage.getByLabel('Status')
    const category = agentPage.getByLabel('Category')
    const assignee = agentPage.getByLabel('Assigned to')

    await expect(status).toBeEnabled()
    await status.selectOption({ label: 'Resolved' })
    await expect(status).toHaveValue(TicketStatus.RESOLVED)
    await expect(status).toBeEnabled()
    await category.selectOption({ label: 'Refund Request' })
    await expect(category).toHaveValue(TicketCategory.REFUND_REQUEST)
    await expect(category).toBeEnabled()
    await assignee.selectOption({ label: AGENT.name })
    await expect(assignee.locator('option:checked')).toHaveText(AGENT.name)
    await expect(assignee).toBeEnabled()

    await agentPage.reload()
    await expect(agentPage.getByLabel('Status')).toHaveValue(TicketStatus.RESOLVED)
    await expect(agentPage.getByLabel('Category')).toHaveValue(TicketCategory.REFUND_REQUEST)
    await expect(agentPage.getByLabel('Assigned to').locator('option:checked')).toHaveText(AGENT.name)

    // null unassigns and clears the category
    await agentPage.getByLabel('Assigned to').selectOption({ label: 'Unassigned' })
    await expect(agentPage.getByLabel('Assigned to')).toBeEnabled()
    await agentPage.getByLabel('Category').selectOption({ label: 'Uncategorized' })
    await expect(agentPage.getByLabel('Category')).toBeEnabled()
    await agentPage.reload()
    await expect(agentPage.getByLabel('Assigned to')).toHaveValue('')
    await expect(agentPage.getByLabel('Category')).toHaveValue('')
  })

  test('a reply posted through the form persists after reload with the signed-in author', async ({
    request,
    agentPage,
  }) => {
    const t = await createTicket(request)
    const reply = `Reply text ${uniqueSuffix()}`
    await agentPage.goto(`/tickets/${t.id}`)
    await expect(agentPage.getByText('No replies yet.')).toBeVisible()

    await agentPage.getByLabel('Reply', { exact: true }).fill(reply)
    await agentPage.getByRole('button', { name: 'Send reply' }).click()

    const thread = agentPage.getByRole('list', { name: 'Replies' })
    await expect(thread.getByText(reply)).toBeVisible()
    await expect(agentPage.getByLabel('Reply', { exact: true })).toHaveValue('')

    await agentPage.reload()
    const item = agentPage.getByRole('list', { name: 'Replies' }).getByRole('listitem')
    await expect(item).toHaveCount(1)
    await expect(item).toContainText(reply)
    await expect(item).toContainText(AGENT.name)
  })

  test('shows "Ticket not found" for an unknown or non-numeric id', async ({ agentPage }) => {
    await agentPage.goto('/tickets/999999999')
    await expect(agentPage.getByRole('alert')).toHaveText('Ticket not found')

    await agentPage.goto('/tickets/not-a-number')
    await expect(agentPage.getByRole('alert')).toHaveText('Ticket not found')
  })

  test('signed-out visitors are redirected to /login', async ({ page }) => {
    await page.goto('/tickets/1')
    await expect(page).toHaveURL(/\/login$/)
  })
})

test.describe('ticket detail API', () => {
  test('returns 401 for signed-out requests', async ({ request }) => {
    const t = await createTicket(request)
    expect((await request.get(`/api/tickets/${t.id}`)).status()).toBe(401)
    expect((await request.patch(`/api/tickets/${t.id}`, { data: { status: TicketStatus.CLOSED } })).status()).toBe(401)
    expect((await request.get(`/api/tickets/${t.id}/replies`)).status()).toBe(401)
    expect((await request.post(`/api/tickets/${t.id}/replies`, { data: { body: 'x' } })).status()).toBe(401)
  })

  test('validates and 404s correctly for signed-in users', async ({ request, agentPage }) => {
    const t = await createTicket(request)
    const api = agentPage.request

    expect((await api.get('/api/tickets/abc')).status()).toBe(404)
    expect((await api.get('/api/tickets/999999999')).status()).toBe(404)
    expect((await api.patch('/api/tickets/999999999', { data: { status: TicketStatus.CLOSED } })).status()).toBe(404)
    expect((await api.get('/api/tickets/999999999/replies')).status()).toBe(404)
    expect((await api.post('/api/tickets/999999999/replies', { data: { body: 'hi' } })).status()).toBe(404)

    // Invalid bodies
    expect((await api.patch(`/api/tickets/${t.id}`, { data: {} })).status()).toBe(400)
    expect((await api.patch(`/api/tickets/${t.id}`, { data: { status: 'BOGUS' } })).status()).toBe(400)
    expect((await api.post(`/api/tickets/${t.id}/replies`, { data: { body: '   ' } })).status()).toBe(400)

    // Unknown assignee is rejected; the ticket is unchanged
    const bad = await api.patch(`/api/tickets/${t.id}`, { data: { assignedToId: 'no-such-user' } })
    expect(bad.status()).toBe(400)
    const after = await (await api.get(`/api/tickets/${t.id}`)).json()
    expect(after.assignedTo).toBeNull()
  })

  test('an admin cannot be assigned a ticket (agents only)', async ({ request, adminPage }) => {
    const t = await createTicket(request)
    const api = adminPage.request
    const session = await (await api.get('/api/auth/get-session')).json()
    const res = await api.patch(`/api/tickets/${t.id}`, { data: { assignedToId: session.user.id } })
    expect(res.status()).toBe(400)
  })

  test('replies come back oldest first with the author', async ({ request, adminPage }) => {
    const t = await createTicket(request)
    const api = adminPage.request
    for (const body of ['first', 'second']) {
      const res = await api.post(`/api/tickets/${t.id}/replies`, { data: { body } })
      expect(res.status()).toBe(201)
    }
    const { replies } = await (await api.get(`/api/tickets/${t.id}/replies`)).json()
    expect(replies.map((r: { body: string }) => r.body)).toEqual(['first', 'second'])
    expect(replies[0].author.name).toBe('Admin')
  })
})
