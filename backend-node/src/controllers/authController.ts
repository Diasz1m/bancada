import type { Request, Response } from 'express'
import { compareSync } from 'bcryptjs'
import { Auth } from '../auth.js'
import { Database } from '../database.js'
import { bearer, fail, json } from '../http.js'
import type { UserRow } from '../types.js'

export class AuthController {
  static login(req: Request, res: Response): void {
    const email = String(req.body?.email ?? '').trim()
    const password = String(req.body?.password ?? '')

    const errors: Record<string, string> = {}
    if (email === '') {
      errors.email = 'Informe o e-mail.'
    }
    if (password === '') {
      errors.password = 'Informe a senha.'
    }
    if (Object.keys(errors).length > 0) {
      fail('Dados inválidos.', 422, errors)
    }

    const found = Database.sqlite()
      .prepare('SELECT * FROM users WHERE email = @email')
      .get({ email }) as UserRow | undefined

    if (!found || !compareSync(password, found.password)) {
      fail('Credenciais inválidas.', 401)
    }

    json(res, {
      token: Auth.issueToken(Number(found.id)),
      user: Auth.publicUser(found),
    })
  }

  static logout(req: Request, res: Response): void {
    Auth.revoke(bearer(req))
    json(res, { ok: true })
  }

  static me(req: Request, res: Response): void {
    json(res, { user: Auth.publicUser(req.user!) })
  }
}
