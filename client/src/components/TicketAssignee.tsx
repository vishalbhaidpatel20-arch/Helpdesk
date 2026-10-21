import type { TicketAgent } from '@helpdesk/core'
import { NativeSelect } from '@/components/ui/native-select'
import { useTicketAgents } from '@/hooks/useTicketAgents'

type Props = {
  assignedTo: TicketAgent | null
  onChange: (agentId: string | null) => void
  disabled?: boolean
}

// Select to assign the ticket to an agent or clear the assignment
export default function TicketAssignee({ assignedTo, onChange, disabled }: Props) {
  const { data: agents = [], isError } = useTicketAgents()
  // Keep the current assignee selectable even if they are no longer in the agent list
  const options = assignedTo && !agents.some((a) => a.id === assignedTo.id) ? [assignedTo, ...agents] : agents

  return (
    <>
      <NativeSelect
        aria-label="Assigned to"
        value={assignedTo?.id ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">Unassigned</option>
        {options.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.name}
          </option>
        ))}
      </NativeSelect>
      {isError && (
        <span role="alert" className="text-destructive">
          Failed to load agents
        </span>
      )}
    </>
  )
}
