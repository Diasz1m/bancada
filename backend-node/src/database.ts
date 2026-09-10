import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { hashSync } from 'bcryptjs'
import Sqlite from 'better-sqlite3'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export class Database {
  private static connection: Sqlite.Database | null = null

  static boot(): Sqlite.Database {
    const dir = path.resolve(__dirname, '../data')
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const dbPath = path.join(dir, 'bancada.sqlite')
    const fresh = !fs.existsSync(dbPath) || fs.statSync(dbPath).size === 0

    const db = new Sqlite(dbPath)
    db.pragma('foreign_keys = ON')
    this.connection = db

    if (fresh) {
      this.migrate()
      this.seed()
    }

    return db
  }

  static sqlite(): Sqlite.Database {
    if (this.connection === null) {
      return this.boot()
    }

    return this.connection
  }

  private static migrate(): void {
    this.sqlite().exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'agente', 'solicitante'))
      );

      CREATE TABLE tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('aberto', 'em_andamento', 'resolvido')),
        priority TEXT NOT NULL CHECK(priority IN ('baixa', 'media', 'alta')),
        requester_id INTEGER NOT NULL,
        assignee_id INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (requester_id) REFERENCES users(id),
        FOREIGN KEY (assignee_id) REFERENCES users(id)
      );

      CREATE TABLE comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `)
  }

  private static seed(): void {
    const password = hashSync('senha123', 10)
    const insertUser = this.sqlite().prepare(
      'INSERT INTO users (name, email, password, role) VALUES (@name, @email, @password, @role)',
    )

    const users: Array<[string, string, string]> = [
      ['Ana Souza', 'ana@bancada.test', 'agente'],
      ['Carlos Lima', 'carlos@bancada.test', 'solicitante'],
      ['Marina Alves', 'admin@bancada.test', 'admin'],
    ]

    for (const [name, email, role] of users) {
      insertUser.run({ name, email, password, role })
    }

    const now = new Date().toISOString()
    const insertTicket = this.sqlite().prepare(`
      INSERT INTO tickets (title, description, status, priority, requester_id, assignee_id, created_at, updated_at)
      VALUES (@title, @description, @status, @priority, @requester_id, @assignee_id, @created_at, @updated_at)
    `)

    const tickets: Array<[string, string, string, string, number, number]> = [
      [
        'VPN corporativa cai a cada 20 minutos',
        'Desde a troca do firewall, a VPN desconecta sozinha. Afeta o time comercial em home office.',
        'aberto',
        'alta',
        2,
        1,
      ],
      [
        'Notebook não reconhece o segundo monitor',
        'Dock Dell, monitor HDMI. Funcionava na semana passada.',
        'em_andamento',
        'media',
        2,
        1,
      ],
      [
        'Liberar acesso ao drive de projetos',
        'Carlos precisa da pasta /projetos/2026 para a proposta da ACME.',
        'resolvido',
        'baixa',
        2,
        3,
      ],
    ]

    for (const [title, description, status, priority, requesterId, assigneeId] of tickets) {
      insertTicket.run({
        title,
        description,
        status,
        priority,
        requester_id: requesterId,
        assignee_id: assigneeId,
        created_at: now,
        updated_at: now,
      })
    }

    this.sqlite()
      .prepare(
        'INSERT INTO comments (ticket_id, user_id, body, created_at) VALUES (@ticket_id, @user_id, @body, @created_at)',
      )
      .run({
        ticket_id: 2,
        user_id: 1,
        body: 'Vou testar outro dongle HDMI amanhã de manhã.',
        created_at: now,
      })
  }
}
