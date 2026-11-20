<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Http;
use PDO;

final class TicketController
{
    private const STATUSES = ['aberto', 'em_andamento', 'resolvido'];
    private const PRIORITIES = ['baixa', 'media', 'alta'];

    public function stats(array $params, ?array $user): void
    {
        $rows = Database::pdo()
            ->query('SELECT status, COUNT(*) as total FROM tickets GROUP BY status')
            ->fetchAll();

        $counts = ['aberto' => 0, 'em_andamento' => 0, 'resolvido' => 0];
        foreach ($rows as $row) {
            $counts[$row['status']] = (int) $row['total'];
        }

        Http::json([
            'aberto' => $counts['aberto'],
            'em_andamento' => $counts['em_andamento'],
            'resolvido' => $counts['resolvido'],
            'total' => array_sum($counts),
        ]);
    }

    public function index(array $params, ?array $user): void
    {
        $status = $_GET['status'] ?? null;
        $sql = $this->ticketSelect() . ' ORDER BY t.created_at DESC';
        $bindings = [];

        if (is_string($status) && $status !== '' && $status !== 'todos') {
            if (!in_array($status, self::STATUSES, true)) {
                Http::error('Status inválido.', 422, ['status' => 'Use aberto, em_andamento ou resolvido.']);
            }
            $sql = $this->ticketSelect() . ' WHERE t.status = :status ORDER BY t.created_at DESC';
            $bindings['status'] = $status;
        }

        $stmt = Database::pdo()->prepare($sql);
        $stmt->execute($bindings);

        Http::json(['tickets' => array_map($this->mapTicket(...), $stmt->fetchAll())]);
    }

    public function show(array $params, ?array $user): void
    {
        $ticket = $this->find((int) $params['id']);
        if ($ticket === null) {
            Http::error('Chamado não encontrado.', 404);
        }

        $comments = Database::pdo()->prepare(
            'SELECT c.id, c.body, c.created_at, u.name AS author
             FROM comments c
             INNER JOIN users u ON u.id = c.user_id
             WHERE c.ticket_id = :id
             ORDER BY c.created_at ASC'
        );
        $comments->execute(['id' => $ticket['id']]);

        Http::json([
            'ticket' => $this->mapTicket($ticket),
            'comments' => array_map(static fn (array $row): array => [
                'id' => (int) $row['id'],
                'body' => $row['body'],
                'author' => $row['author'],
                'created_at' => $row['created_at'],
            ], $comments->fetchAll()),
        ]);
    }

    public function store(array $params, ?array $user): void
    {
        $body = Http::body();
        $title = trim((string) ($body['title'] ?? ''));
        $description = trim((string) ($body['description'] ?? ''));
        $priority = (string) ($body['priority'] ?? 'media');

        $errors = [];
        if ($title === '') {
            $errors['title'] = 'Título é obrigatório.';
        }
        if ($description === '') {
            $errors['description'] = 'Descrição é obrigatória.';
        }
        if (!in_array($priority, self::PRIORITIES, true)) {
            $errors['priority'] = 'Prioridade inválida.';
        }
        if ($errors !== []) {
            Http::error('Dados inválidos.', 422, $errors);
        }

        $now = gmdate('c');
        $stmt = Database::pdo()->prepare(
            'INSERT INTO tickets (title, description, status, priority, requester_id, assignee_id, created_at, updated_at)
             VALUES (:title, :description, :status, :priority, :requester_id, NULL, :created_at, :updated_at)'
        );
        $stmt->execute([
            'title' => $title,
            'description' => $description,
            'status' => 'aberto',
            'priority' => $priority,
            'requester_id' => $user['id'],
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $created = $this->find((int) Database::pdo()->lastInsertId());
        Http::json(['ticket' => $this->mapTicket($created)], 201);
    }

    public function update(array $params, ?array $user): void
    {
        $ticket = $this->find((int) $params['id']);
        if ($ticket === null) {
            Http::error('Chamado não encontrado.', 404);
        }

        if (!in_array($user['role'], ['admin', 'agente'], true)) {
            Http::error('Sem permissão para alterar o chamado.', 403);
        }

        $body = Http::body();
        $status = $body['status'] ?? $ticket['status'];
        $assigneeId = array_key_exists('assignee_id', $body)
            ? $body['assignee_id']
            : $ticket['assignee_id'];

        if (!in_array($status, self::STATUSES, true)) {
            Http::error('Status inválido.', 422, ['status' => 'Status desconhecido.']);
        }

        $tookOver = ($ticket['ai_outcome'] ?? 'triagem') === 'triagem'
            && ($status !== 'aberto' || $assigneeId !== $ticket['assignee_id']);
        $aiOutcome = $tookOver ? 'escalado' : ($ticket['ai_outcome'] ?? 'triagem');

        $stmt = Database::pdo()->prepare(
            'UPDATE tickets
             SET status = :status, assignee_id = :assignee_id, ai_outcome = :ai_outcome, updated_at = :updated_at
             WHERE id = :id'
        );
        $stmt->execute([
            'status' => $status,
            'assignee_id' => $assigneeId,
            'ai_outcome' => $aiOutcome,
            'updated_at' => gmdate('c'),
            'id' => $ticket['id'],
        ]);

        $updated = $this->find((int) $ticket['id']);
        Http::json(['ticket' => $this->mapTicket($updated)]);
    }

    public function comment(array $params, ?array $user): void
    {
        $ticket = $this->find((int) $params['id']);
        if ($ticket === null) {
            Http::error('Chamado não encontrado.', 404);
        }

        $body = trim((string) (Http::body()['body'] ?? ''));
        if ($body === '') {
            Http::error('Dados inválidos.', 422, ['body' => 'Comentário vazio.']);
        }

        $stmt = Database::pdo()->prepare(
            'INSERT INTO comments (ticket_id, user_id, body, created_at)
             VALUES (:ticket_id, :user_id, :body, :created_at)'
        );
        $stmt->execute([
            'ticket_id' => $ticket['id'],
            'user_id' => $user['id'],
            'body' => $body,
            'created_at' => gmdate('c'),
        ]);

        Http::json(['ok' => true], 201);
    }

    public function findPublic(int $id): ?array
    {
        return $this->find($id);
    }

    public function mapPublic(?array $row): array
    {
        return $this->mapTicket($row);
    }

    private function ticketSelect(): string
    {
        return 'SELECT t.*,
                requester.name AS requester_name,
                assignee.name AS assignee_name
             FROM tickets t
             INNER JOIN users requester ON requester.id = t.requester_id
             LEFT JOIN users assignee ON assignee.id = t.assignee_id';
    }

    private function find(int $id): ?array
    {
        $stmt = Database::pdo()->prepare($this->ticketSelect() . ' WHERE t.id = :id');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    private function mapTicket(?array $row): array
    {
        if ($row === null) {
            return [];
        }

        return [
            'id' => (int) $row['id'],
            'title' => $row['title'],
            'description' => $row['description'],
            'status' => $row['status'],
            'priority' => $row['priority'],
            'ai_outcome' => in_array($row['ai_outcome'] ?? '', ['triagem', 'resolvido_ia', 'escalado'], true)
                ? $row['ai_outcome']
                : 'triagem',
            'requester' => $row['requester_name'],
            'assignee' => $row['assignee_name'],
            'requester_id' => (int) $row['requester_id'],
            'assignee_id' => $row['assignee_id'] !== null ? (int) $row['assignee_id'] : null,
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
        ];
    }
}
