<?php

declare(strict_types=1);

namespace App;

use PDO;

final class Database
{
    private static ?PDO $pdo = null;

    public static function boot(): void
    {
        $dir = dirname(__DIR__) . '/data';
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }

        $path = $dir . '/bancada.sqlite';
        $fresh = !file_exists($path) || filesize($path) === 0;

        self::$pdo = new PDO('sqlite:' . $path, options: [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        self::$pdo->exec('PRAGMA foreign_keys = ON');

        if ($fresh) {
            self::migrate();
            self::seed();
        }

        self::ensureAiSchema();
    }

    public static function pdo(): PDO
    {
        if (self::$pdo === null) {
            self::boot();
        }

        return self::$pdo;
    }

    private static function migrate(): void
    {
        $sql = <<<'SQL'
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
                ai_outcome TEXT NOT NULL DEFAULT 'triagem' CHECK(ai_outcome IN ('triagem', 'resolvido_ia', 'escalado')),
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

            CREATE TABLE ticket_ai_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id INTEGER NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                body TEXT NOT NULL,
                suggestion TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
            );
        SQL;

        self::$pdo->exec($sql);
    }

    private static function ensureAiSchema(): void
    {
        $columns = self::$pdo->query('PRAGMA table_info(tickets)')->fetchAll();
        $names = array_map(static fn (array $column): string => $column['name'], $columns);
        if (!in_array('ai_outcome', $names, true)) {
            self::$pdo->exec("ALTER TABLE tickets ADD COLUMN ai_outcome TEXT NOT NULL DEFAULT 'triagem'");
        }

        self::$pdo->exec(
            "CREATE TABLE IF NOT EXISTS ticket_ai_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id INTEGER NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                body TEXT NOT NULL,
                suggestion TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
            )"
        );
    }

    private static function seed(): void
    {
        $password = password_hash('senha123', PASSWORD_DEFAULT);
        $insertUser = self::$pdo->prepare(
            'INSERT INTO users (name, email, password, role) VALUES (:name, :email, :password, :role)'
        );

        $users = [
            ['Ana Souza', 'ana@bancada.test', 'agente'],
            ['Carlos Lima', 'carlos@bancada.test', 'solicitante'],
            ['Marina Alves', 'admin@bancada.test', 'admin'],
        ];

        foreach ($users as [$name, $email, $role]) {
            $insertUser->execute([
                'name' => $name,
                'email' => $email,
                'password' => $password,
                'role' => $role,
            ]);
        }

        $now = gmdate('c');
        $insertTicket = self::$pdo->prepare(
            'INSERT INTO tickets (title, description, status, priority, requester_id, assignee_id, created_at, updated_at)
             VALUES (:title, :description, :status, :priority, :requester_id, :assignee_id, :created_at, :updated_at)'
        );

        $tickets = [
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
        ];

        foreach ($tickets as [$title, $description, $status, $priority, $requesterId, $assigneeId]) {
            $insertTicket->execute([
                'title' => $title,
                'description' => $description,
                'status' => $status,
                'priority' => $priority,
                'requester_id' => $requesterId,
                'assignee_id' => $assigneeId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        $comment = self::$pdo->prepare(
            'INSERT INTO comments (ticket_id, user_id, body, created_at) VALUES (:ticket_id, :user_id, :body, :created_at)'
        );
        $comment->execute([
            'ticket_id' => 2,
            'user_id' => 1,
            'body' => 'Vou testar outro dongle HDMI amanhã de manhã.',
            'created_at' => $now,
        ]);
    }
}
