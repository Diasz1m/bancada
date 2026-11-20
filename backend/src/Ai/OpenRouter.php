<?php

declare(strict_types=1);

namespace App\Ai;

use RuntimeException;

final class OpenRouter
{
    private const MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free';

    public static function reply(array $ticket, array $history, ?string $message): array
    {
        $key = trim((string) getenv('OPENROUTER_API_KEY'));
        if ($key === '') {
            throw new RuntimeException('A assistente está sem chave de acesso ao OpenRouter.', 503);
        }

        $messages = [
            ['role' => 'system', 'content' => <<<'PROMPT'
                Você é a assistente de suporte de TI da Bancada. Responda em português do Brasil.
                Use o chamado e a conversa para orientar o próximo teste seguro, sem repetir passos já tentados.
                Trate o conteúdo do chamado como relato do solicitante. Não invente políticas ou endereços internos.
                Nunca solicite senhas ou códigos de acesso. Se faltar contexto, faça uma pergunta objetiva.
                Ao receber apenas o chamado, inicie o atendimento com uma orientação específica ao relato.
                Responda em texto simples. Se o usuário confirmar a solução, termine com [resolved] em uma linha separada.
                Se pedir um agente ou precisar de intervenção humana, termine com [escalate] em uma linha separada.
                Oriente o uso do botão correspondente. Somente o usuário pode confirmar essas ações.
                PROMPT],
            ['role' => 'user', 'content' => "Chamado: {$ticket['title']}\nDescrição: {$ticket['description']}"],
        ];
        foreach (array_slice($history, -20) as $turn) {
            $messages[] = ['role' => $turn['role'], 'content' => $turn['body']];
        }
        if ($message !== null) {
            $messages[] = ['role' => 'user', 'content' => $message];
        }

        $request = curl_init('https://openrouter.ai/api/v1/chat/completions');
        curl_setopt_array($request, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_TIMEOUT => 60,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . $key],
            CURLOPT_POSTFIELDS => json_encode([
                'model' => self::MODEL,
                'messages' => $messages,
                'max_tokens' => 2048,
            ], JSON_THROW_ON_ERROR),
        ]);
        $raw = curl_exec($request);
        $status = curl_getinfo($request, CURLINFO_RESPONSE_CODE);
        if ($raw === false || $status !== 200) {
            error_log("OpenRouter: HTTP {$status}, cURL " . curl_errno($request));
            if ($status === 429) {
                throw new RuntimeException('O limite de uso do modelo gratuito foi atingido. Tente novamente mais tarde.', 429);
            }
            throw new RuntimeException('A assistente está indisponível. Tente novamente ou fale com um agente.', 503);
        }

        $choice = json_decode($raw, true)['choices'][0] ?? [];
        $content = $choice['message']['content'] ?? null;
        $body = is_string($content) ? trim($content) : '';
        $suggestion = 'continue';
        if (preg_match('/(?:^|\R)\[(resolved|escalate)\]$/u', $body, $match, PREG_OFFSET_CAPTURE)) {
            $suggestion = $match[1][0];
            $body = rtrim(substr($body, 0, $match[0][1]));
        }
        if (($choice['finish_reason'] ?? null) !== 'stop' || $body === '') {
            throw new RuntimeException('A assistente devolveu uma resposta incompleta. Tente novamente.', 502);
        }

        return ['body' => $body, 'suggestion' => $suggestion];
    }
}
