<?php

declare(strict_types=1);

namespace App;

final class Http
{
    public static function handleCors(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? 'http://localhost:5173';
        $allowed = [
            'http://localhost:5173',
            'http://127.0.0.1:5173',
        ];

        if (in_array($origin, $allowed, true)) {
            header("Access-Control-Allow-Origin: {$origin}");
        }

        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Authorization, Content-Type');
        header('Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS');
        header('Content-Type: application/json; charset=utf-8');
    }

    public static function json(mixed $data, int $status = 200): never
    {
        http_response_code($status);
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function error(string $message, int $status = 400, array $errors = []): never
    {
        $payload = ['message' => $message];
        if ($errors !== []) {
            $payload['errors'] = $errors;
        }
        self::json($payload, $status);
    }

    public static function body(): array
    {
        $raw = file_get_contents('php://input') ?: '';
        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : [];
    }

    public static function bearer(): ?string
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/Bearer\s+(\S+)/i', $header, $matches) === 1) {
            return $matches[1];
        }

        return null;
    }
}
