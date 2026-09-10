<?php

declare(strict_types=1);

namespace App\Ai;

final class Assistant
{
    /** @var list<array{id:string,title:string,keywords:list<string>,steps:list<string>,extra:list<string>}> */
    private const ARTICLES = [
        [
            'id' => 'vpn',
            'title' => 'VPN que cai ou não conecta',
            'keywords' => ['vpn', 'firewall', 'tunel', 'túnel', 'home office', 'desconecta', 'cai', 'anyconnect', 'forticlient', 'rede corporativa'],
            'steps' => [
                'Feche o cliente VPN por completo (não só minimizar) e abra de novo.',
                'Escolha o perfil “Bancada 2026”. O perfil antigo quebrou depois da troca do firewall.',
                'Se pedir certificado, aceite o da TI. Recusar a troca costuma derrubar o túnel a cada poucos minutos.',
                'Teste um site interno (intranet) e um externo. Se só o interno falhar, ainda é VPN.',
            ],
            'extra' => [
                'Desative Wi-Fi temporário / “segurança de rede” do antivírus só para testar.',
                'Troque de rede (do Wi-Fi de casa para o 4G do celular). Se estabilizar, o provedor está filtrando UDP.',
                'Reinstale o cliente VPN a partir do portal interno; não use o instalador antigo.',
            ],
        ],
        [
            'id' => 'monitor',
            'title' => 'Segundo monitor / dock HDMI',
            'keywords' => ['monitor', 'hdmi', 'displayport', 'dock', 'docket', 'tela', 'segundo', 'projetor', 'usb-c', 'usbc'],
            'steps' => [
                'Desconecte a dock da tomada e do notebook, espere 20 segundos, reconecte alimentação primeiro e só depois o USB-C.',
                'No Windows: clique com o botão direito na área de trabalho → Configurações de vídeo → Detectar.',
                'Troque o cabo HDMI (ou use a porta DisplayPort da dock, se houver). Cabo solto é a causa mais comum.',
                'Em “Configurações de vídeo”, confirme que a tela extra não está em “Desconectar este vídeo”.',
            ],
            'extra' => [
                'Atualize o driver da dock no site da Dell/Lenovo — o Windows Update costuma atrasar isso.',
                'Teste o monitor direto no HDMI do notebook, sem a dock, para isolar o acessório.',
                'Se for dongle USB-C genérico, troque por um certificado; vários param depois de sleep.',
            ],
        ],
        [
            'id' => 'drive',
            'title' => 'Acesso a pasta ou drive de projetos',
            'keywords' => ['drive', 'pasta', 'projetos', 'compartilha', 'permissao', 'permissão', 'smb', 'rede', 'acesso negado', 'acme'],
            'steps' => [
                'Confirme se você está na VPN. Sem túnel, o drive \\bancada\\projetos nem aparece.',
                'No Explorer, acesse \\\\bancada\\projetos — não use o atalho antigo da área de trabalho.',
                'Se der “acesso negado”, peça para o gestor do time confirmar o grupo AD (ex.: projetos-2026).',
                'Saia e entre de novo no Windows (logoff) depois que o grupo for liberado; a permissão não pega na hora.',
            ],
            'extra' => [
                'Mapeie de novo: Explorer → Este Computador → Mapear unidade de rede → \\\\bancada\\projetos.',
                'Se o caminho mudou no ano, use /projetos/2026 e não a pasta do ano anterior.',
            ],
        ],
        [
            'id' => 'senha',
            'title' => 'Senha, bloqueio ou MFA',
            'keywords' => ['senha', 'password', 'bloqueio', 'bloqueada', 'mfa', '2fa', 'token', 'login', 'ad', 'conta'],
            'steps' => [
                'Aguarde 15 minutos se a conta travou por tentativas. O desbloqueio automático roda nesse intervalo.',
                'Redefina em https://senha.bancada.test com o e-mail corporativo. Use uma senha nova; a política rejeita as últimas 5.',
                'No MFA, aprove o push no telefone. Se o aparelho trocou, diga aqui que precisa re-enrolar o token.',
                'Não use a senha de e-mail pessoal. A conta da Bancada é outra.',
            ],
            'extra' => [
                'Se o MFA está no celular antigo, um agente precisa resetar o token — isso eu não faço sozinha.',
                'Caps Lock e teclado numérico derrubam muita gente no login da VPN.',
            ],
        ],
        [
            'id' => 'impressora',
            'title' => 'Impressora da sala ou do andar',
            'keywords' => ['impressora', 'imprimir', 'print', 'toner', 'papel', 'fila', 'spooler'],
            'steps' => [
                'Veja se a impressora não está em erro de papel/toner no painel.',
                'No Windows: Configurações → Bluetooth e dispositivos → Impressoras → abrir a fila e limpar documentos travados.',
                'Remova a impressora e adicione de novo pelo nome BANCADA-ANDAR-XX no catálogo.',
                'Reinicie o spooler: serviços do Windows → Spooler de Impressão → Reiniciar.',
            ],
            'extra' => [
                'Impressão em PDF/XPS às vezes indica driver quebrado; reinstale pelo portal de TI.',
                'Se só a sua máquina falha e as outras imprimem, o problema não é o equipamento do andar.',
            ],
        ],
        [
            'id' => 'email',
            'title' => 'Outlook / e-mail corporativo',
            'keywords' => ['email', 'e-mail', 'outlook', 'caixa', 'smtp', 'ost', 'assinatura', 'calendario', 'calendário'],
            'steps' => [
                'Feche o Outlook, abra de novo e espere a barra inferior sair de “Desconectado”.',
                'Arquivo → Configurações da conta → Reparar perfil.',
                'Se a caixa não atualiza, trabalhe um pouco pelo webmail (mail.bancada.test) para confirmar se é só o cliente.',
                'Anexos grandes (>25 MB) não saem; use o drive e envie o link.',
            ],
            'extra' => [
                'Perfil OST corrompido: criar um perfil novo no Painel de Controle → Mail costuma resolver.',
                'Regra de inbox demais pode “sumir” com mensagem; verifique a pasta Itens automáticos.',
            ],
        ],
        [
            'id' => 'wifi',
            'title' => 'Wi-Fi do escritório',
            'keywords' => ['wifi', 'wi-fi', 'wireless', 'ssid', 'sinal', 'rede sem fio', 'internet cai'],
            'steps' => [
                'Esqueça a rede BANCADA-CORP e conecte de novo com a senha do crachá (não a de convidados).',
                'Prefira a faixa 5 GHz. A 2.4 GHz no andar comercial fica saturada.',
                'Reinicie o adaptador: modo avião 10 segundos, depois desligue.',
                'Se for notebook novo, instale o driver Wi-Fi do fabricante; o genérico da Microsoft falha com o controlador da empresa.',
            ],
            'extra' => [
                'No home office isso não se aplica — aí o caminho é a VPN, não o SSID interno.',
                'Certificado Wi-Fi expira todo ano em março; se cair só no escritório, avise.',
            ],
        ],
        [
            'id' => 'lento',
            'title' => 'Computador lento',
            'keywords' => ['lento', 'travando', 'travou', 'demora', 'cpu', 'memoria', 'memória', 'disco', 'desempenho'],
            'steps' => [
                'Reinicie o notebook. Updates do Windows acumulados deixam o disco em 100% até o reboot.',
                'Abra o Gerenciador de tarefas e veja se Teams, Chrome ou um backup está em CPU/Disco altos.',
                'Libere pelo menos 15% de disco em C:. Abaixo disso o Windows começa a engasgar.',
                'Feche o OneDrive na bandeja se ele estiver “sincronizando 10 mil arquivos”.',
            ],
            'extra' => [
                'Máquina com HDD (não SSD) e 8 GB de RAM não aguenta o pacote atual — aí precisa de troca, e eu escalo.',
                'Após as 18h o antivírus roda scan pesado; se só trava à noite, é isso.',
            ],
        ],
        [
            'id' => 'software',
            'title' => 'Instalar ou liberar software',
            'keywords' => ['instalar', 'software', 'licenca', 'licença', 'aplicativo', 'programa', 'office', 'adobe', 'vpn client'],
            'steps' => [
                'Abra o Company Portal / portal de software. O que está lá instala sem chamado.',
                'Não baixe instalador da internet; o antivírus bloqueia e a TI precisa limpar depois.',
                'Se o app pedir admin, cancele e registre o nome exato da ferramenta aqui.',
                'Licenças pagas (Adobe, Visio) passam por aprovação do gestor — eu já deixo isso preparado se for o caso.',
            ],
            'extra' => [
                'Versão errada de Office (32 vs 64 bits) quebra add-in; desinstale pelo portal e reinstale a 64 bits.',
            ],
        ],
    ];

    /** @param list<array{role:string,body:string}> $history */
    public static function opening(string $title, string $description): array
    {
        $article = self::bestArticle($title . ' ' . $description);
        if ($article === null) {
            return [
                'suggestion' => 'continue',
                'body' => "Olá, sou a assistente da Bancada. Vou tentar resolver isso antes de um agente pegar o chamado.\n\nAinda não fechei um procedimento óbvio. Me diga, por favor:\n1. Qual a mensagem de erro exata, se houver.\n2. Quando começou (hoje, depois de uma troca de equipamento, etc.).\n3. O que você já tentou.\n\nSe preferir não debugar agora, peça para falar com um agente.",
            ];
        }

        return [
            'suggestion' => 'continue',
            'body' => "Olá, sou a assistente da Bancada. Pelo que você descreveu, isso parece: {$article['title']}.\n\nTente nesta ordem:\n" . self::number($article['steps']) . "\n\nMe avise se funcionou. Se não, sigo para o próximo procedimento ou encaminho a um agente.",
        ];
    }

    /** @param list<array{role:string,body:string}> $history */
    public static function reply(string $title, string $description, array $history, string $message): array
    {
        $intent = self::detectIntent($message);
        $assistantTurns = count(array_filter($history, static fn (array $item): bool => $item['role'] === 'assistant'));
        $userText = implode(' ', array_map(
            static fn (array $item): string => $item['body'],
            array_filter($history, static fn (array $item): bool => $item['role'] === 'user'),
        ));
        $ranked = self::rankArticles($title . ' ' . $description . ' ' . $userText . ' ' . $message);
        $article = $ranked[0] ?? null;

        if ($intent === 'resolved') {
            return [
                'suggestion' => 'resolved',
                'body' => 'Ótimo — então fechamos por aqui. Confirme em “Isso resolveu” para o chamado sair da fila. Se voltar a acontecer, abra outro ou escreva de novo.',
            ];
        }

        if ($intent === 'escalate' || $assistantTurns >= 3) {
            return [
                'suggestion' => 'escalate',
                'body' => 'Certo. Não vou insistir no automático. Use “Falar com um agente” e a conversa fica no chamado para a TI ver o que já foi tentado.',
            ];
        }

        if ($intent === 'failed') {
            if ($article !== null && $assistantTurns < 2 && $article['extra'] !== []) {
                return [
                    'suggestion' => 'continue',
                    'body' => "Sem problema. Segundo nível para {$article['title']}:\n\n" . self::number($article['extra']) . "\n\nSe ainda falhar, melhor um agente. Use o botão abaixo.",
                ];
            }

            return [
                'suggestion' => 'escalate',
                'body' => 'Não tenho outro procedimento seguro daqui. Encaminhe a um agente para não perder tempo.',
            ];
        }

        if ($article === null) {
            return [
                'suggestion' => 'continue',
                'body' => 'Entendi. Pode detalhar o equipamento, o horário em que falha e se mais alguém do time é afetado? Com isso eu escolho o procedimento — ou encaminho.',
            ];
        }

        $steps = array_slice($article['steps'], 0, 3);
        return [
            'suggestion' => 'continue',
            'body' => "Beleza. Mantendo o foco em {$article['title']}:\n\n" . self::number($steps) . "\n\nQual desses passos você já fez, e o que aconteceu depois?",
        ];
    }

    public static function bootstrap(array $ticket): void
    {
        $stmt = \App\Database::pdo()->prepare('SELECT COUNT(*) FROM ticket_ai_messages WHERE ticket_id = :id');
        $stmt->execute(['id' => $ticket['id']]);
        if ((int) $stmt->fetchColumn() > 0) {
            return;
        }

        $opening = self::opening((string) $ticket['title'], (string) $ticket['description']);
        self::insertMessage((int) $ticket['id'], 'assistant', $opening['body'], $opening['suggestion']);
    }

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

    private static function detectIntent(string $message): string
    {
        if (preg_match('/(nao\s+funcion|não\s+funcion|nao\s+deu|não\s+deu|ainda\s+nao|ainda\s+não|nao\s+rolou|não\s+rolou|continua o mesmo|mesmo erro|ja\s+tentei|já\s+tentei|nao\s+ajudou|não\s+ajudou)/iu', $message) === 1) {
            return 'failed';
        }
        if (preg_match('/\b(agente|humano|pessoa|tecnico|técnico|fila|chamado humano|falar com|atendente)\b/iu', $message) === 1) {
            return 'escalate';
        }
        if (preg_match('/\b(resolveu|resolvido|deu certo|deu bom|obrigad|era isso|tudo certo|problema sumiu|ja esta ok|já está ok|consegui)\b/iu', $message) === 1
            || preg_match('/(?<!nao\s)(?<!não\s)\bfuncionou\b/iu', $message) === 1) {
            return 'resolved';
        }

        return 'other';
    }

    private static function bestArticle(string $text): ?array
    {
        return self::rankArticles($text)[0] ?? null;
    }

    /** @return list<array{id:string,title:string,keywords:list<string>,steps:list<string>,extra:list<string>}> */
    private static function rankArticles(string $text): array
    {
        $scored = [];
        foreach (self::ARTICLES as $article) {
            $score = self::score($text, $article);
            if ($score > 0) {
                $scored[] = ['article' => $article, 'score' => $score];
            }
        }
        usort($scored, static fn (array $a, array $b): int => $b['score'] <=> $a['score']);

        return array_column($scored, 'article');
    }

    private static function score(string $text, array $article): int
    {
        $haystack = self::normalize($text);
        $points = 0;
        foreach ($article['keywords'] as $keyword) {
            if (str_contains($haystack, self::normalize($keyword))) {
                $points += 2;
            }
        }
        if (str_contains($haystack, self::normalize($article['title']))) {
            $points += 3;
        }

        return $points;
    }

    private static function normalize(string $value): string
    {
        $converted = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        return mb_strtolower($converted === false ? $value : $converted);
    }

    /** @param list<string> $items */
    private static function number(array $items): string
    {
        $lines = [];
        foreach ($items as $index => $item) {
            $lines[] = ($index + 1) . '. ' . $item;
        }

        return implode("\n", $lines);
    }
}
