import type { Request, Response, NextFunction } from 'express'

export class HttpError extends Error {
  readonly status: number
  readonly errors: Record<string, string>

  constructor(message: string, status = 400, errors: Record<string, string> = {}) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.errors = errors
  }
}

export function fail(message: string, status = 400, errors: Record<string, string> = {}): never {
  throw new HttpError(message, status, errors)
}

export function json(res: Response, data: unknown, status = 200): void {
  res.status(status).json(data)
}

export function bearer(req: Request): string | null {
  const header = req.header('authorization') ?? ''
  const match = header.match(/Bearer\s+(\S+)/i)
  return match?.[1] ?? null
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    const payload: { message: string; errors?: Record<string, string> } = { message: err.message }
    if (Object.keys(err.errors).length > 0) {
      payload.errors = err.errors
    }
    res.status(err.status).json(payload)
    return
  }

  console.error(err)
  res.status(500).json({ message: 'Erro interno.' })
}
