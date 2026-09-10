# Bancada — Vue 3 + PHP / Node

Helpdesk interno para refrescar a stack da vaga: **Vue 3 (Composition API, Router, Pinia)** falando com uma **API JSON**. Há duas implementações com o mesmo contrato (Bearer token, 401/403/422): **PHP 8** na porta `8000` e **Node + TypeScript** na porta `8001`.

A trilha semanal está no canvas [trilha-vue-php](file:///C:/Users/mathe/.cursor/projects/c-estudo-vueJs/canvases/trilha-vue-php.canvas.tsx) (abre ao lado do chat).

## Como rodar

PHP não precisa estar instalado no Windows. A API sobe com Docker. Node já é usado no frontend.

```bash
docker compose up --build
```

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Abra `http://localhost:5173`.

| E-mail | Senha | Papel |
| --- | --- | --- |
| ana@bancada.test | senha123 | agente (altera status) |
| carlos@bancada.test | senha123 | solicitante (só abre e comenta) |
| admin@bancada.test | senha123 | admin |

## O que treinar neste código

- Guard de rota + token no Pinia
- Interceptor Axios (401 volta para o login)
- Filtro de lista que vai para o PHP, não só no cliente
- Validação 422 por campo no formulário
- 403 quando um solicitante tenta mudar status

Depois do MVP, recrie a mesma API em Laravel (migrations, Eloquent, FormRequest, Sanctum). O Vue quase não muda.

## API Node + TypeScript

Mesmas rotas, mesmas regras e os mesmos usuários de teste. SQLite próprio em `backend-node/data/`.

```bash
cd backend-node
npm install
npm run dev
```

A API sobe em `http://localhost:8001`. No frontend, aponte o proxy:

```bash
cd frontend
API_PROXY=http://localhost:8001 npm run dev
```

Ou com Docker, junto da API PHP:

```bash
docker compose up --build
```

A API Node fica em `http://localhost:8001`.

## Alternativa sem Docker

Instale PHP 8.3+ com PDO SQLite (Laragon é o caminho mais comum no Windows) e rode:

```bash
php -S localhost:8000 -t backend/public
```
