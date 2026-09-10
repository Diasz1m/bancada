<?php

declare(strict_types=1);

spl_autoload_register(static function (string $class): void {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }

    $relative = substr($class, strlen($prefix));
    $file = __DIR__ . '/' . str_replace('\\', '/', $relative) . '.php';
    if (is_file($file)) {
        require $file;
    }
});

App\Http::handleCors();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

App\Database::boot();

$router = new App\Router();
$router->post('/api/login', [App\Controllers\AuthController::class, 'login']);
$router->post('/api/logout', [App\Controllers\AuthController::class, 'logout'], true);
$router->get('/api/me', [App\Controllers\AuthController::class, 'me'], true);
$router->get('/api/stats', [App\Controllers\TicketController::class, 'stats'], true);
$router->get('/api/tickets', [App\Controllers\TicketController::class, 'index'], true);
$router->post('/api/tickets', [App\Controllers\TicketController::class, 'store'], true);
$router->get('/api/tickets/{id}', [App\Controllers\TicketController::class, 'show'], true);
$router->patch('/api/tickets/{id}', [App\Controllers\TicketController::class, 'update'], true);
$router->post('/api/tickets/{id}/comments', [App\Controllers\TicketController::class, 'comment'], true);

$router->dispatch();
