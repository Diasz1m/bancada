<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Database;
use App\Http;

final class AuthController
{
    public function login(array $params, ?array $user): void
    {
        $body = Http::body();
        $email = trim((string) ($body['email'] ?? ''));
        $password = (string) ($body['password'] ?? '');

        $errors = [];
        if ($email === '') {
            $errors['email'] = 'Informe o e-mail.';
        }
        if ($password === '') {
            $errors['password'] = 'Informe a senha.';
        }
        if ($errors !== []) {
            Http::error('Dados inválidos.', 422, $errors);
        }

        $stmt = Database::pdo()->prepare('SELECT * FROM users WHERE email = :email');
        $stmt->execute(['email' => $email]);
        $found = $stmt->fetch();

        if (!$found || !password_verify($password, $found['password'])) {
            Http::error('Credenciais inválidas.', 401);
        }

        $token = Auth::issueToken((int) $found['id']);

        Http::json([
            'token' => $token,
            'user' => Auth::publicUser($found),
        ]);
    }

    public function logout(array $params, ?array $user): void
    {
        Auth::revoke(Http::bearer());
        Http::json(['ok' => true]);
    }

    public function me(array $params, ?array $user): void
    {
        Http::json(['user' => Auth::publicUser($user ?? [])]);
    }
}
