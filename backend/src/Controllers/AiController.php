<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Ai\Assistant;
use App\Ai\OpenRouter;
use App\Database;
use App\Http;
use PDO;

final class AiController
{
    public function show(array $params, ?array $user): void
    {
        $ticket = $this->requireTicket($params);
        $ticketId = (int) $ticket['id'];
        if ($this->isOpenForAi($ticket) && !$this->loadMessages($ticketId)) {
            $this->assertCanChat($user, $ticket);
            $this->generateReply($ticket, [], null);
        }
        Http::json($this->snapshot($ticketId));
    }

    public function message(array $params, ?array $user): void
    {
        $ticket = $this->requireTicket($params);
        $this->assertCanChat($user, $ticket);

        if (!$this->isOpenForAi($ticket)) {
            Http::error('A assistente já encerrou este atendimento.', 409);
        }

        $message = trim((string) (Http::body()['message'] ?? ''));
        if ($message === '') {
            Http::error('Dados inválidos.', 422, ['message' => 'Escreva uma mensagem.']);
        }

        $ticketId = (int) $ticket['id'];
        $this->generateReply($ticket, $this->loadMessages($ticketId), $message);
        Http::json($this->snapshot($ticketId), 201);
    }

    private function generateReply(array $ticket, array $history, ?string $message): void
    {
        $ticketId = (int) $ticket['id'];
        try {
            $reply = OpenRouter::reply($ticket, $history, $message);
        } catch (\RuntimeException $error) {
            Http::error($error->getMessage(), $error->getCode());
        }

        $db = Database::pdo();
        $db->beginTransaction();
        try {
            // Acquire the SQLite write lock and check the conversation used for this reply.
            $guard = $db->prepare(
                "UPDATE tickets SET ai_outcome = 'triagem'
                 WHERE id = :id AND status != 'resolvido' AND ai_outcome = 'triagem'
                 AND (SELECT COALESCE(MAX(id), 0) FROM ticket_ai_messages WHERE ticket_id = :id) = :last_id"
            );
            $guard->bindValue(':id', $ticketId, PDO::PARAM_INT);
            $guard->bindValue(':last_id', end($history)['id'] ?? 0, PDO::PARAM_INT);
            $guard->execute();
            if ($guard->rowCount() === 0) {
                $db->rollBack();
                if ($message === null) {
                    return;
                }
                Http::error('O atendimento mudou. Atualize o chamado antes de enviar novamente.', 409);
            }

            if ($message !== null) {
                Assistant::insertMessage($ticketId, 'user', $message, null);
            }
            Assistant::insertMessage($ticketId, 'assistant', $reply['body'], $reply['suggestion']);
            $db->commit();
        } catch (\Throwable $error) {
            $db->rollBack();
            throw $error;
        }

    }

    public function resolve(array $params, ?array $user): void
    {
        $ticket = $this->requireTicket($params);
        $this->assertCanChat($user, $ticket);

        if ($ticket['status'] === 'resolvido') {
            Http::error('Chamado já está resolvido.', 409);
        }

        $this->setOutcome((int) $ticket['id'], 'resolvido_ia', 'resolvido');
        $this->insertComment((int) $ticket['id'], (int) $user['id'], 'Resolvido com a assistente, sem fila humana.');

        Http::json($this->snapshot((int) $ticket['id']));
    }

    public function escalate(array $params, ?array $user): void
    {
        $ticket = $this->requireTicket($params);
        $this->assertCanChat($user, $ticket);

        if (!$this->isOpenForAi($ticket)) {
            Http::error('Este chamado já está com um agente.', 409);
        }

        $this->setOutcome((int) $ticket['id'], 'escalado', (string) $ticket['status']);
        $this->insertComment(
            (int) $ticket['id'],
            (int) $user['id'],
            'Solicitante pediu um agente depois da triagem da assistente. O histórico da IA está no chamado.'
        );
        Assistant::insertMessage(
            (int) $ticket['id'],
            'assistant',
            'Encaminhei para a fila humana. Um agente vê o histórico e continua daqui.',
            'escalate'
        );

        Http::json($this->snapshot((int) $ticket['id']));
    }

    private function requireTicket(array $params): array
    {
        $ticket = (new TicketController())->findPublic((int) $params['id']);
        if ($ticket === null) {
            Http::error('Chamado não encontrado.', 404);
        }

        return $ticket;
    }

    private function assertCanChat(?array $user, array $ticket): void
    {
        $isStaff = in_array($user['role'] ?? '', ['admin', 'agente'], true);
        if (!$isStaff && (int) $ticket['requester_id'] !== (int) $user['id']) {
            Http::error('Sem permissão para falar com a assistente neste chamado.', 403);
        }
    }

    private function isOpenForAi(array $ticket): bool
    {
        $outcome = $ticket['ai_outcome'] ?? 'triagem';
        return $ticket['status'] !== 'resolvido' && $outcome === 'triagem';
    }

    private function snapshot(int $ticketId): array
    {
        $ticket = (new TicketController())->findPublic($ticketId);
        if ($ticket === null) {
            Http::error('Chamado não encontrado.', 404);
        }

        $messages = $this->loadMessages($ticketId);
        $suggested = null;
        for ($i = count($messages) - 1; $i >= 0; $i--) {
            if ($messages[$i]['role'] === 'assistant') {
                $suggested = $messages[$i]['suggestion'];
                break;
            }
        }

        return [
            'ticket' => (new TicketController())->mapPublic($ticket),
            'messages' => $messages,
            'outcome' => in_array($ticket['ai_outcome'] ?? '', ['triagem', 'resolvido_ia', 'escalado'], true)
                ? $ticket['ai_outcome']
                : 'triagem',
            'suggested_action' => $suggested,
        ];
    }

    private function loadMessages(int $ticketId): array
    {
        $stmt = Database::pdo()->prepare(
            'SELECT id, role, body, suggestion, created_at
             FROM ticket_ai_messages
             WHERE ticket_id = :ticket_id
             ORDER BY id ASC'
        );
        $stmt->execute(['ticket_id' => $ticketId]);

        return array_map(static function (array $row): array {
            $suggestion = $row['suggestion'];
            if (!in_array($suggestion, ['continue', 'resolved', 'escalate'], true)) {
                $suggestion = null;
            }

            return [
                'id' => (int) $row['id'],
                'role' => $row['role'],
                'body' => $row['body'],
                'suggestion' => $suggestion,
                'created_at' => $row['created_at'],
            ];
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    private function setOutcome(int $ticketId, string $outcome, string $status): void
    {
        $stmt = Database::pdo()->prepare(
            'UPDATE tickets
             SET ai_outcome = :ai_outcome, status = :status, updated_at = :updated_at
             WHERE id = :id'
        );
        $stmt->execute([
            'ai_outcome' => $outcome,
            'status' => $status,
            'updated_at' => gmdate('c'),
            'id' => $ticketId,
        ]);
    }

    private function insertComment(int $ticketId, int $userId, string $body): void
    {
        $stmt = Database::pdo()->prepare(
            'INSERT INTO comments (ticket_id, user_id, body, created_at)
             VALUES (:ticket_id, :user_id, :body, :created_at)'
        );
        $stmt->execute([
            'ticket_id' => $ticketId,
            'user_id' => $userId,
            'body' => $body,
            'created_at' => gmdate('c'),
        ]);
    }
}
