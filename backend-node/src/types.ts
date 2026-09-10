export type Role = 'admin' | 'agente' | 'solicitante'
export type Status = 'aberto' | 'em_andamento' | 'resolvido'
export type Priority = 'baixa' | 'media' | 'alta'
export type AiOutcome = 'triagem' | 'resolvido_ia' | 'escalado'
export type AiSuggestion = 'continue' | 'resolved' | 'escalate'

export interface User {
  id: number
  name: string
  email: string
  role: Role
}

export interface UserRow extends User {
  password: string
}

export interface Ticket {
  id: number
  title: string
  description: string
  status: Status
  priority: Priority
  ai_outcome: AiOutcome
  requester: string
  assignee: string | null
  requester_id: number
  assignee_id: number | null
  created_at: string
  updated_at: string
}

export interface TicketRow {
  id: number
  title: string
  description: string
  status: Status
  priority: Priority
  ai_outcome: AiOutcome
  requester_id: number
  assignee_id: number | null
  created_at: string
  updated_at: string
  requester_name: string
  assignee_name: string | null
}

export interface Comment {
  id: number
  body: string
  author: string
  created_at: string
}

export interface AiMessage {
  id: number
  role: 'user' | 'assistant'
  body: string
  suggestion: AiSuggestion | null
  created_at: string
}

declare global {
  namespace Express {
    interface Request {
      user?: User
    }
  }
}

export {}
