<?php

declare(strict_types=1);

namespace App;

final class Router
{
    /** @var list<array{method:string, pattern:string, handler:array, auth:bool}> */
    private array $routes = [];

    public function get(string $path, array $handler, bool $auth = false): void
    {
        $this->add('GET', $path, $handler, $auth);
    }

    public function post(string $path, array $handler, bool $auth = false): void
    {
        $this->add('POST', $path, $handler, $auth);
    }

    public function patch(string $path, array $handler, bool $auth = false): void
    {
        $this->add('PATCH', $path, $handler, $auth);
    }

    private function add(string $method, string $path, array $handler, bool $auth): void
    {
        $this->routes[] = [
            'method' => $method,
            'pattern' => $path,
            'handler' => $handler,
            'auth' => $auth,
        ];
    }

    public function dispatch(): void
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

        foreach ($this->routes as $route) {
            $params = $this->match($route['pattern'], $uri);
            if ($route['method'] !== $method || $params === null) {
                continue;
            }

            $user = null;
            if ($route['auth']) {
                $user = Auth::requireUser();
            }

            [$class, $action] = $route['handler'];
            $controller = new $class();
            $controller->{$action}($params, $user);
            return;
        }

        Http::error('Rota não encontrada.', 404);
    }

    private function match(string $pattern, string $uri): ?array
    {
        $regex = preg_replace('#\{([a-zA-Z_]+)\}#', '(?P<$1>[^/]+)', $pattern);
        if (preg_match('#^' . $regex . '$#', $uri, $matches) !== 1) {
            return null;
        }

        return array_filter(
            $matches,
            static fn (string|int $key): bool => is_string($key),
            ARRAY_FILTER_USE_KEY
        );
    }
}
