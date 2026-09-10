import { Database } from './database.js'
import type { AiOutcome, Ticket, TicketRow } from './types.js'

export const TICKET_SELECT = `SELECT t.*,
        requester.name AS requester_name,
        assignee.name AS assignee_name
     FROM tickets t
     INNER JOIN users requester ON requester.id = t.requester_id
     LEFT JOIN users assignee ON assignee.id = t.assignee_id`

export function findTicket(id: number): TicketRow | null {
  if (!Number.isInteger(id) || id <= 0) {
    return null
  }

  const row = Database.sqlite()
    .prepare(`${TICKET_SELECT} WHERE t.id = @id`)
    .get({ id }) as TicketRow | undefined

  return row ?? null
}

export function mapTicket(row: TicketRow | null): Ticket | Record<string, never> {
  if (row === null) {
    return {}
  }

  return {
    id: Number(row.id),
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    ai_outcome: normalizeOutcome(row.ai_outcome),
    requester: row.requester_name,
    assignee: row.assignee_name,
    requester_id: Number(row.requester_id),
    assignee_id: row.assignee_id !== null ? Number(row.assignee_id) : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function normalizeOutcome(value: string | null | undefined): AiOutcome {
  if (value === 'resolvido_ia' || value === 'escalado' || value === 'triagem') {
    return value
  }
  return 'triagem'
}
