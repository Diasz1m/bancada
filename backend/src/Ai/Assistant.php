<?php

declare(strict_types=1);

namespace App\Ai;

final class Assistant
{
    public static function insertMessage(int $ticketId, string $role, string $body, ?string $suggestion): void
    {
        $stmt = \App\Database::pdo()->prepare(
            'INSERT INTO ticket_ai_messages (ticket_id, role, body, suggestion, created_at)
             VALUES (:ticket_id, :role, :body, :suggestion, :created_at)'
        );
        $stmt->execute([
            'ticket_id' => $ticketId,
            'role' => $role,
            'body' => $body,
            'suggestion' => $suggestion,
            'created_at' => gmdate('c'),
        ]);
    }
}
