<?php

declare(strict_types=1);

namespace App;

final class Auth
{
    public static function user(?string $token): ?array
    {
        if ($token === null || $token === '') {
            return null;
        }

        $stmt = Database::pdo()->prepare(
            'SELECT u.id, u.name, u.email, u.role
             FROM tokens t
             INNER JOIN users u ON u.id = t.user_id
             WHERE t.token = :token'
        );
        $stmt->execute(['token' => $token]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    public static function requireUser(): array
    {
        $user = self::user(Http::bearer());
        if ($user === null) {
            Http::error('Não autenticado.', 401);
        }

        return $user;
    }

    public static function issueToken(int $userId): string
    {
        $token = bin2hex(random_bytes(32));
        $stmt = Database::pdo()->prepare(
            'INSERT INTO tokens (user_id, token, created_at) VALUES (:user_id, :token, :created_at)'
        );
        $stmt->execute([
            'user_id' => $userId,
            'token' => $token,
            'created_at' => gmdate('c'),
        ]);

        return $token;
    }

    public static function revoke(?string $token): void
    {
        if ($token === null) {
            return;
        }

        $stmt = Database::pdo()->prepare('DELETE FROM tokens WHERE token = :token');
        $stmt->execute(['token' => $token]);
    }

    public static function publicUser(array $user): array
    {
        return [
            'id' => (int) $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role'],
        ];
    }
}
