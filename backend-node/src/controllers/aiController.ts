import type { Request, Response } from 'express'
import { Assistant } from '../ai/assistant.js'
import { Database } from '../database.js'
import { fail, json, nowIso } from '../http.js'
import type { AiMessage, AiOutcome, AiSuggestion, TicketRow, User } from '../types.js'
import { findTicket, mapTicket } from '../tickets.js'

const OUTCOMES: AiOutcome[] = ['triagem', 'resolvido_ia', 'escalado']

export class AiController {
  static show(req: Request, res: Response): void {
    const ticket = requireTicket(req)
    const payload = hydrate(ticket)
    json(res, payload)
  }

  static message(req: Request, res: Response): void {
    const ticket = requireTicket(req)
    assertCanChat(req.user!, ticket)

    if (!isOpenForAi(ticket)) {
      fail('A assistente já encerrou este atendimento.', 409)
    }

    const message = String(req.body?.message ?? '').trim()
    if (message === '') {
      fail('Dados inválidos.', 422, { message: 'Escreva uma mensagem.' })
    }

    hydrate(ticket)
    insertMessage(ticket.id, 'user', message, null)

    const history = loadMessages(ticket.id).map((row) => ({ role: row.role, body: row.body }))
    const reply = Assistant.reply(ticket.title, ticket.description, history.slice(0, -1), message)
    insertMessage(ticket.id, 'assistant', reply.body, reply.suggestion)

    json(res, snapshot(ticket.id), 201)
  }

  static resolve(req: Request, res: Response): void {
    const ticket = requireTicket(req)
    assertCanChat(req.user!, ticket)

    if (ticket.status === 'resolvido') {
      fail('Chamado já está resolvido.', 409)
    }

    setOutcome(ticket.id, 'resolvido_ia', 'resolvido')
    insertComment(ticket.id, req.user!.id, 'Resolvido com a assistente, sem fila humana.')

    json(res, snapshot(ticket.id))
  }

  static escalate(req: Request, res: Response): void {
    const ticket = requireTicket(req)
    assertCanChat(req.user!, ticket)

    if (!isOpenForAi(ticket)) {
      fail('Este chamado já está com um agente.', 409)
    }

    setOutcome(ticket.id, 'escalado', ticket.status === 'aberto' ? 'aberto' : ticket.status)
    insertComment(
      ticket.id,
      req.user!.id,
      'Solicitante pediu um agente depois da triagem da assistente. O histórico da IA está no chamado.',
    )
    insertMessage(
      ticket.id,
      'assistant',
      'Encaminhei para a fila humana. Um agente vê o histórico e continua daqui.',
      'escalate',
    )

    json(res, snapshot(ticket.id))
  }
}

export function bootstrapAi(ticket: TicketRow): void {
  const existing = loadMessages(ticket.id)
  if (existing.length > 0) {
    return
  }

  const opening = Assistant.opening(ticket.title, ticket.description)
  insertMessage(ticket.id, 'assistant', opening.body, opening.suggestion)
}

function requireTicket(req: Request): TicketRow {
  const ticket = findTicket(Number.parseInt(String(req.params.id), 10))
  if (ticket === null) {
    fail('Chamado não encontrado.', 404)
  }
  return ticket
}

function assertCanChat(user: User, ticket: TicketRow): void {
  const isStaff = ['admin', 'agente'].includes(user.role)
  if (!isStaff && Number(ticket.requester_id) !== Number(user.id)) {
    fail('Sem permissão para falar com a assistente neste chamado.', 403)
  }
}

function isOpenForAi(ticket: TicketRow): boolean {
  return ticket.status !== 'resolvido' && ticket.ai_outcome === 'triagem'
}

function hydrate(ticket: TicketRow): ReturnType<typeof snapshot> {
  if (ticket.ai_outcome === 'triagem' && ticket.status !== 'resolvido') {
    bootstrapAi(ticket)
  }
  return snapshot(ticket.id)
}

function snapshot(ticketId: number): {
  ticket: ReturnType<typeof mapTicket>
  messages: AiMessage[]
  outcome: AiOutcome
  suggested_action: AiSuggestion | null
} {
  const ticket = findTicket(ticketId)
  if (ticket === null) {
    fail('Chamado não encontrado.', 404)
  }

  const messages = loadMessages(ticketId)
  const lastAssistant = [...messages].reverse().find((row) => row.role === 'assistant')

  return {
    ticket: mapTicket(ticket),
    messages,
    outcome: normalizeOutcome(ticket.ai_outcome),
    suggested_action: lastAssistant?.suggestion ?? null,
  }
}

function loadMessages(ticketId: number): AiMessage[] {
  const rows = Database.sqlite()
    .prepare(
      `SELECT id, role, body, suggestion, created_at
       FROM ticket_ai_messages
       WHERE ticket_id = @ticket_id
       ORDER BY id ASC`,
    )
    .all({ ticket_id: ticketId }) as Array<{
    id: number
    role: 'user' | 'assistant'
    body: string
    suggestion: string | null
    created_at: string
  }>

  return rows.map((row) => ({
    id: Number(row.id),
    role: row.role,
    body: row.body,
    suggestion: row.suggestion === 'continue' || row.suggestion === 'resolved' || row.suggestion === 'escalate'
      ? row.suggestion
      : null,
    created_at: row.created_at,
  }))
}

function insertMessage(
  ticketId: number,
  role: 'user' | 'assistant',
  body: string,
  suggestion: AiSuggestion | null,
): void {
  Database.sqlite()
    .prepare(
      `INSERT INTO ticket_ai_messages (ticket_id, role, body, suggestion, created_at)
       VALUES (@ticket_id, @role, @body, @suggestion, @created_at)`,
    )
    .run({
      ticket_id: ticketId,
      role,
      body,
      suggestion,
      created_at: nowIso(),
    })
}

function setOutcome(ticketId: number, outcome: AiOutcome, status: string): void {
  Database.sqlite()
    .prepare(
      `UPDATE tickets
       SET ai_outcome = @ai_outcome, status = @status, updated_at = @updated_at
       WHERE id = @id`,
    )
    .run({
      ai_outcome: outcome,
      status,
      updated_at: nowIso(),
      id: ticketId,
    })
}

function insertComment(ticketId: number, userId: number, body: string): void {
  Database.sqlite()
    .prepare(
      `INSERT INTO comments (ticket_id, user_id, body, created_at)
       VALUES (@ticket_id, @user_id, @body, @created_at)`,
    )
    .run({
      ticket_id: ticketId,
      user_id: userId,
      body,
      created_at: nowIso(),
    })
}

function normalizeOutcome(value: string | null | undefined): AiOutcome {
  if (value !== undefined && value !== null && OUTCOMES.includes(value as AiOutcome)) {
    return value as AiOutcome
  }
  return 'triagem'
}
