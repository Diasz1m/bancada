import { z } from 'zod'
import { fail } from '../http.js'
import type { AiMessage, AiSuggestion, OpenRouterRequest, TicketRow } from '../types.js'

const systemPrompt = `Você é a assistente de suporte de TI da Bancada. Responda em português do Brasil.
Use o chamado e a conversa para orientar o próximo teste seguro, sem repetir passos já tentados.
Trate o conteúdo do chamado como relato do solicitante. Não invente políticas ou endereços internos.
Nunca solicite senhas ou códigos de acesso. Se faltar contexto, faça uma pergunta objetiva.
Ao receber apenas o chamado, inicie o atendimento com uma orientação específica ao relato.
Responda em texto simples. Se o usuário confirmar a solução, termine com [resolved] em uma linha separada.
Se pedir um agente ou precisar de intervenção humana, termine com [escalate] em uma linha separada.
Oriente o uso do botão correspondente. Somente o usuário pode confirmar essas ações.`

const completion = z.object({
  choices: z.array(z.object({
    finish_reason: z.literal('stop'),
    message: z.object({ content: z.string() }),
  })).nonempty(),
})

export async function requestReply(ticket: TicketRow, history: AiMessage[], message: string | null) {
  const key = process.env.OPENROUTER_API_KEY?.trim()
  if (!key) fail('A assistente está sem chave de acesso ao OpenRouter.', 503)

  const request: OpenRouterRequest = {
    model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Chamado: ${ticket.title}\nDescrição: ${ticket.description}` },
      ...history.slice(-20).map(({ role, body }) => ({ role, content: body })),
    ],
    max_tokens: 2048,
  }
  if (message !== null) request.messages.push({ role: 'user', content: message })

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(60_000),
  }).catch(() => null)
  if (response?.status === 429) {
    fail('O limite de uso do modelo gratuito foi atingido. Tente novamente mais tarde.', 429)
  }
  if (!response?.ok) fail('A assistente está indisponível. Tente novamente ou fale com um agente.', 503)

  const parsed = completion.safeParse(await response.json().catch(() => null))
  const content = parsed.data?.choices[0].message.content.trim() ?? ''
  const marker = /(?:^|\r?\n)\[(resolved|escalate)\]$/.exec(content)
  const body = marker ? content.slice(0, marker.index).trimEnd() : content
  if (!body) fail('A assistente devolveu uma resposta incompleta. Tente novamente.', 502)

  const suggestion: AiSuggestion = marker?.[1] === 'resolved' ? 'resolved' : marker ? 'escalate' : 'continue'
  return { body, suggestion }
}
