import { fireEvent, screen, within } from '@testing-library/react'
import type { TicketAgent } from '@helpdesk/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { renderWithQuery } from '@/test/renderWithQuery'
import TicketAssignee from './TicketAssignee'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }))

const get = vi.mocked(api.get)

const alex: TicketAgent = { id: 'u1', name: 'Alex Agent' }
const sam: TicketAgent = { id: 'u2', name: 'Sam Support' }

function optionNames(select: HTMLElement) {
  return within(select)
    .getAllByRole('option')
    .map((option) => option.textContent)
}

describe('TicketAssignee', () => {
  beforeEach(() => {
    get.mockReset()
    get.mockResolvedValue({ data: { agents: [alex, sam] } })
  })

  it('requests the assignable agents', async () => {
    renderWithQuery(<TicketAssignee assignedTo={null} onChange={vi.fn()} />)
    await screen.findByRole('option', { name: alex.name })
    expect(get).toHaveBeenCalledWith('/tickets/agents', expect.anything())
  })

  it('offers Unassigned first, then each agent', async () => {
    renderWithQuery(<TicketAssignee assignedTo={null} onChange={vi.fn()} />)
    const select = screen.getByLabelText('Assigned to')
    await within(select).findByRole('option', { name: sam.name })
    expect(optionNames(select)).toEqual(['Unassigned', alex.name, sam.name])
  })

  it('selects Unassigned when there is no assignee', async () => {
    renderWithQuery(<TicketAssignee assignedTo={null} onChange={vi.fn()} />)
    await screen.findByRole('option', { name: alex.name })
    expect(screen.getByLabelText('Assigned to')).toHaveValue('')
  })

  it('selects the current assignee', async () => {
    renderWithQuery(<TicketAssignee assignedTo={sam} onChange={vi.fn()} />)
    await screen.findByRole('option', { name: alex.name })
    expect(screen.getByLabelText('Assigned to')).toHaveValue(sam.id)
  })

  it('keeps an assignee who is not in the agent list selectable', async () => {
    const former: TicketAgent = { id: 'u9', name: 'Former Agent' }
    renderWithQuery(<TicketAssignee assignedTo={former} onChange={vi.fn()} />)
    await screen.findByRole('option', { name: alex.name })
    const select = screen.getByLabelText('Assigned to')
    expect(select).toHaveValue(former.id)
    expect(optionNames(select)).toContain(former.name)
  })

  it('reports the chosen agent id', async () => {
    const onChange = vi.fn()
    renderWithQuery(<TicketAssignee assignedTo={null} onChange={onChange} />)
    await screen.findByRole('option', { name: sam.name })

    fireEvent.change(screen.getByLabelText('Assigned to'), { target: { value: sam.id } })

    expect(onChange).toHaveBeenCalledWith(sam.id)
  })

  it('reports null when Unassigned is chosen', async () => {
    const onChange = vi.fn()
    renderWithQuery(<TicketAssignee assignedTo={alex} onChange={onChange} />)
    await screen.findByRole('option', { name: sam.name })

    fireEvent.change(screen.getByLabelText('Assigned to'), { target: { value: '' } })

    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('disables the select when disabled', async () => {
    renderWithQuery(<TicketAssignee assignedTo={null} onChange={vi.fn()} disabled />)
    await screen.findByRole('option', { name: alex.name })
    expect(screen.getByLabelText('Assigned to')).toBeDisabled()
  })

  it('shows an error when the agents fail to load, but still offers Unassigned', async () => {
    get.mockRejectedValue(new Error('boom'))
    renderWithQuery(<TicketAssignee assignedTo={null} onChange={vi.fn()} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load agents')
    expect(optionNames(screen.getByLabelText('Assigned to'))).toEqual(['Unassigned'])
  })
})
