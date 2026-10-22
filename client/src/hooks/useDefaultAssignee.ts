import type { TicketAssigneeFilter } from '@helpdesk/core'
import { authClient } from '@/lib/auth-client'
import { Role } from '@/lib/roles'

// Which tickets a page shows when the URL does not choose: agents their own, admins everything
export function useDefaultAssignee(): TicketAssigneeFilter {
  const { data: session } = authClient.useSession()
  return session?.user.role === Role.AGENT ? 'me' : 'all'
}
