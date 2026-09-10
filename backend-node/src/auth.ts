import { randomBytes } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { Database } from './database.js'
import { bearer, fail, nowIso } from './http.js'
import type { User } from './types.js'

export class Auth {
  static user(token: string | null): User | null {
    if (token === null || token === '') {
      return null
    }

    const found = Database.sqlite()
      .prepare(
        `SELECT u.id, u.name, u.email, u.role
         FROM tokens t
         INNER JOIN users u ON u.id = t.user_id
         WHERE t.token = @token`,
      )
      .get({ token }) as User | undefined

    return found ?? null
  }

  static requireUser(token: string | null): User {
    const user = this.user(token)
    if (user === null) {
      fail('Não autenticado.', 401)
    }

    return user
  }

  static issueToken(userId: number): string {
    const token = randomBytes(32).toString('hex')
    Database.sqlite()
      .prepare('INSERT INTO tokens (user_id, token, created_at) VALUES (@user_id, @token, @created_at)')
      .run({
        user_id: userId,
        token,
        created_at: nowIso(),
      })

    return token
  }

  static revoke(token: string | null): void {
    if (token === null) {
      return
    }

    Database.sqlite().prepare('DELETE FROM tokens WHERE token = @token').run({ token })
  }

  static publicUser(user: User): User {
    return {
      id: Number(user.id),
      name: user.name,
      email: user.email,
      role: user.role,
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  req.user = Auth.requireUser(bearer(req))
  next()
}
