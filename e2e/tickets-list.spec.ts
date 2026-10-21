import type { APIRequestContext, Page } from '@playwright/test'
import { expect, test } from './fixtures/auth'

const WEBHOOK_URL = '/api/webhooks/inbound-email'
const SECRET = process.env.INBOUND_EMAIL_SECRET ?? 'test-inbound-secret-123'

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function postTicket(request: APIRequestContext, subject: string) {
  const suffix = uniqueSuffix()
  const res = await request.post(WEBHOOK_URL, {
    headers: { 'x-webhook-secret': SECRET },
    data: {
      senderName: `Sender ${suffix}`,
      senderEmail: `sender-${suffix}@example.com`,
      subject,
      text: 'Ticket list test message.',
      messageId: `<msg-${suffix}@mail.example.com>`,
    },
  })
  expect(res.status()).toBe(201)
}

// Rows of the table body that belong to this test (other specs share the database)
function rowsWith(page: Page, prefix: string) {
  return page.getByRole('row').filter({ hasText: prefix })
}

const subjectHeader = (page: Page) => page.getByRole('columnheader', { name: 'Subject' })
const receivedHeader = (page: Page) => page.getByRole('columnheader', { name: 'Received' })
const pagination = (page: Page) => page.getByRole('navigation', { name: 'Pagination' })

test.describe('ticket list', () => {
  // UI-only behaviour (sort toggling, filters, URL state, pagination controls) is covered by
  // client/src/pages/TicketsPage.test.tsx. These e2e tests only cover what needs the real server.
  test('shows the newest ticket first by default', async ({ request, agentPage }) => {
    const prefix = `Newest-${uniqueSuffix()}`
    for (const n of [1, 2, 3]) {
      // Sequential and awaited, so each ticket gets a later createdAt
      await postTicket(request, `${prefix} #${n}`)
    }

    await agentPage.goto('/tickets')
    await expect(agentPage.getByRole('heading', { name: 'Tickets' })).toBeVisible()
    await expect(receivedHeader(agentPage)).toHaveAttribute('aria-sort', 'descending')
    await expect(subjectHeader(agentPage)).toHaveAttribute('aria-sort', 'none')
    await expect(rowsWith(agentPage, prefix)).toHaveText([/#3/, /#2/, /#1/])
  })

  test('paginates the list with Previous and Next', async ({ request, agentPage }) => {
    const id = uniqueSuffix()
    const subjects = Array.from({ length: 21 }, (_, i) => `Page-${id}-${String(i).padStart(2, '0')}`)
    for (let i = 0; i < subjects.length; i += 7) {
      await Promise.all(subjects.slice(i, i + 7).map((s) => postTicket(request, s)))
    }

    await agentPage.goto('/tickets?sort=subject&order=asc')
    const nav = pagination(agentPage)
    await expect(nav.getByText(/^Page 1 of \d+$/)).toBeVisible()
    const label = (await nav.getByText(/^Page 1 of \d+$/).textContent()) ?? ''
    const pageCount = Number(label.match(/of (\d+)/)?.[1])
    expect(pageCount).toBeGreaterThanOrEqual(2)

    await expect(nav.getByRole('button', { name: 'Previous' })).toBeDisabled()
    await expect(nav.getByRole('button', { name: 'Next' })).toBeEnabled()

    await nav.getByRole('button', { name: 'Next' }).click()
    await expect(agentPage).toHaveURL(/page=2/)
    await expect(nav.getByText(`Page 2 of ${pageCount}`)).toBeVisible()
    await expect(nav.getByRole('button', { name: 'Previous' })).toBeEnabled()

    await nav.getByRole('button', { name: 'Previous' }).click()
    await expect(nav.getByText(`Page 1 of ${pageCount}`)).toBeVisible()

    await agentPage.goto(`/tickets?sort=subject&order=asc&page=${pageCount}`)
    await expect(nav.getByText(`Page ${pageCount} of ${pageCount}`)).toBeVisible()
    await expect(nav.getByRole('button', { name: 'Next' })).toBeDisabled()
    await expect(nav.getByRole('button', { name: 'Previous' })).toBeEnabled()
  })
})
