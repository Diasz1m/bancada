import type { Request, Response } from 'express'
import { Database } from '../database.js'
import { fail, json, nowIso } from '../http.js'
import { TICKET_SELECT, findTicket, mapTicket } from '../tickets.js'
import type { Comment, Priority, Status, TicketRow } from '../types.js'

const STATUSES: Status[] = ['aberto', 'em_andamento', 'resolvido']
const PRIORITIES: Priority[] = ['baixa', 'media', 'alta']

export class TicketController {
  static stats(_req: Request, res: Response): void {
    const rows = Database.sqlite()
      .prepare('SELECT status, COUNT(*) as total FROM tickets GROUP BY status')
      .all() as Array<{ status: Status; total: number }>

    const counts: Record<Status, number> = { aberto: 0, em_andamento: 0, resolvido: 0 }
    for (const row of rows) {
      counts[row.status] = Number(row.total)
    }

    json(res, {
      aberto: counts.aberto,
      em_andamento: counts.em_andamento,
      resolvido: counts.resolvido,
      total: counts.aberto + counts.em_andamento + counts.resolvido,
    })
  }

  static index(req: Request, res: Response): void {
    const status = typeof req.query.status === 'string' ? req.query.status : null
    let sql = `${TICKET_SELECT} ORDER BY t.created_at DESC`
    const bindings: { status?: string } = {}

    if (status !== null && status !== '' && status !== 'todos') {
      if (!STATUSES.includes(status as Status)) {
        fail('Status inválido.', 422, { status: 'Use aberto, em_andamento ou resolvido.' })
      }
      sql = `${TICKET_SELECT} WHERE t.status = @status ORDER BY t.created_at DESC`
      bindings.status = status
    }

    const tickets = Database.sqlite().prepare(sql).all(bindings) as TicketRow[]
    json(res, { tickets: tickets.map(mapTicket) })
  }

  static show(req: Request, res: Response): void {
    const ticket = findTicket(Number.parseInt(String(req.params.id), 10))
    if (ticket === null) {
      fail('Chamado não encontrado.', 404)
    }

    const comments = Database.sqlite()
      .prepare(
        `SELECT c.id, c.body, c.created_at, u.name AS author
         FROM comments c
         INNER JOIN users u ON u.id = c.user_id
         WHERE c.ticket_id = @id
         ORDER BY c.created_at ASC`,
      )
      .all({ id: ticket.id }) as Array<{ id: number; body: string; created_at: string; author: string }>

    json(res, {
      ticket: mapTicket(ticket),
      comments: comments.map(
        (row): Comment => ({
          id: Number(row.id),
          body: row.body,
          author: row.author,
          created_at: row.created_at,
        }),
      ),
    })
  }

  static store(req: Request, res: Response): void {
    const title = String(req.body?.title ?? '').trim()
    const description = String(req.body?.description ?? '').trim()
    const priority = String(req.body?.priority ?? 'media')

    const errors: Record<string, string> = {}
    if (title === '') {
      errors.title = 'Título é obrigatório.'
    }
    if (description === '') {
      errors.description = 'Descrição é obrigatória.'
    }
    if (!PRIORITIES.includes(priority as Priority)) {
      errors.priority = 'Prioridade inválida.'
    }
    if (Object.keys(errors).length > 0) {
      fail('Dados inválidos.', 422, errors)
    }

    const now = nowIso()
    const result = Database.sqlite()
      .prepare(
        `INSERT INTO tickets (title, description, status, priority, requester_id, assignee_id, created_at, updated_at)
         VALUES (@title, @description, @status, @priority, @requester_id, NULL, @created_at, @updated_at)`,
      )
      .run({
        title,
        description,
        status: 'aberto',
        priority,
        requester_id: req.user!.id,
        created_at: now,
        updated_at: now,
      })

    const created = findTicket(Number(result.lastInsertRowid))
    json(res, { ticket: mapTicket(created) }, 201)
  }

  static update(req: Request, res: Response): void {
    const ticket = findTicket(Number.parseInt(String(req.params.id), 10))
    if (ticket === null) {
      fail('Chamado não encontrado.', 404)
    }

    if (!['admin', 'agente'].includes(req.user!.role)) {
      fail('Sem permissão para alterar o chamado.', 403)
    }

    const status = (req.body?.status ?? ticket.status) as string
    const assigneeId = Object.prototype.hasOwnProperty.call(req.body ?? {}, 'assignee_id')
      ? req.body.assignee_id
      : ticket.assignee_id

    if (!STATUSES.includes(status as Status)) {
      fail('Status inválido.', 422, { status: 'Status desconhecido.' })
    }

    const tookOver =
      ticket.ai_outcome === 'triagem' && (status !== 'aberto' || assigneeId !== ticket.assignee_id)
    const aiOutcome = tookOver ? 'escalado' : ticket.ai_outcome

    Database.sqlite()
      .prepare(
        `UPDATE tickets
         SET status = @status, assignee_id = @assignee_id, ai_outcome = @ai_outcome, updated_at = @updated_at
         WHERE id = @id`,
      )
      .run({
        status,
        assignee_id: assigneeId,
        ai_outcome: aiOutcome,
        updated_at: nowIso(),
        id: ticket.id,
      })

    const updated = findTicket(Number(ticket.id))
    json(res, { ticket: mapTicket(updated) })
  }

  static comment(req: Request, res: Response): void {
    const ticket = findTicket(Number.parseInt(String(req.params.id), 10))
    if (ticket === null) {
      fail('Chamado não encontrado.', 404)
    }

    const body = String(req.body?.body ?? '').trim()
    if (body === '') {
      fail('Dados inválidos.', 422, { body: 'Comentário vazio.' })
    }

    Database.sqlite()
      .prepare(
        `INSERT INTO comments (ticket_id, user_id, body, created_at)
         VALUES (@ticket_id, @user_id, @body, @created_at)`,
      )
      .run({
        ticket_id: ticket.id,
        user_id: req.user!.id,
        body,
        created_at: nowIso(),
      })

    json(res, { ok: true }, 201)
  }
}
