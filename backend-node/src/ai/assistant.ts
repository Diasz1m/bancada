import { ARTICLES, type Article } from './articles.js'
import type { AiSuggestion } from '../types.js'

export interface ChatMessage {
  role: 'user' | 'assistant'
  body: string
}

export interface AssistantReply {
  body: string
  suggestion: AiSuggestion
}

const RESOLVED =
  /((?<!nao\s)(?<!não\s)\bfuncionou\b|\b(resolveu|resolvido|deu certo|deu bom|obrigad|era isso|tudo certo|problema sumiu|ja esta ok|já está ok|consegui)\b)/i
const ESCALATE = /\b(agente|humano|pessoa|tecnico|técnico|fila|chamado humano|falar com|atendente)\b/i
const FAILED =
  /(nao\s+funcion|não\s+funcion|nao\s+deu|não\s+deu|ainda\s+nao|ainda\s+não|nao\s+rolou|não\s+rolou|continua o mesmo|mesmo erro|ja\s+tentei|já\s+tentei|nao\s+ajudou|não\s+ajudou)/i

export class Assistant {
  static opening(title: string, description: string): AssistantReply {
    const article = bestArticle(`${title} ${description}`)
    if (article === null) {
      return {
        suggestion: 'continue',
        body: [
          'Olá, sou a assistente da Bancada. Vou tentar resolver isso antes de um agente pegar o chamado.',
          '',
          'Ainda não fechei um procedimento óbvio. Me diga, por favor:',
          '1. Qual a mensagem de erro exata, se houver.',
          '2. Quando começou (hoje, depois de uma troca de equipamento, etc.).',
          '3. O que você já tentou.',
          '',
          'Se preferir não debugar agora, peça para falar com um agente.',
        ].join('\n'),
      }
    }

    return {
      suggestion: 'continue',
      body: [
        `Olá, sou a assistente da Bancada. Pelo que você descreveu, isso parece: ${article.title}.`,
        '',
        'Tente nesta ordem:',
        ...number(article.steps),
        '',
        'Me avise se funcionou. Se não, sigo para o próximo procedimento ou encaminho a um agente.',
      ].join('\n'),
    }
  }

  static reply(title: string, description: string, history: ChatMessage[], message: string): AssistantReply {
    const intent = detectIntent(message)
    const assistantTurns = history.filter((item) => item.role === 'assistant').length
    const userText = history.filter((item) => item.role === 'user').map((item) => item.body).join(' ')
    const ranked = rankArticles(`${title} ${description} ${userText} ${message}`)
    const article = ranked[0] ?? null

    if (intent === 'resolved') {
      return {
        suggestion: 'resolved',
        body: 'Ótimo — então fechamos por aqui. Confirme em “Isso resolveu” para o chamado sair da fila. Se voltar a acontecer, abra outro ou escreva de novo.',
      }
    }

    if (intent === 'escalate' || assistantTurns >= 3) {
      return {
        suggestion: 'escalate',
        body: 'Certo. Não vou insistir no automático. Use “Falar com um agente” e a conversa fica no chamado para a TI ver o que já foi tentado.',
      }
    }

    if (intent === 'failed') {
      if (article !== null && assistantTurns < 2 && article.extra.length > 0) {
        return {
          suggestion: 'continue',
          body: [
            `Sem problema. Segundo nível para ${article.title}:`,
            '',
            ...number(article.extra),
            '',
            'Se ainda falhar, melhor um agente. Use o botão abaixo.',
          ].join('\n'),
        }
      }

      return {
        suggestion: 'escalate',
        body: 'Não tenho outro procedimento seguro daqui. Encaminhe a um agente para não perder tempo.',
      }
    }

    if (article === null) {
      return {
        suggestion: 'continue',
        body: 'Entendi. Pode detalhar o equipamento, o horário em que falha e se mais alguém do time é afetado? Com isso eu escolho o procedimento — ou encaminho.',
      }
    }

    return {
      suggestion: 'continue',
      body: [
        `Beleza. Mantendo o foco em ${article.title}:`,
        '',
        ...number(article.steps.slice(0, 3)),
        '',
        'Qual desses passos você já fez, e o que aconteceu depois?',
      ].join('\n'),
    }
  }
}

function detectIntent(message: string): 'resolved' | 'failed' | 'escalate' | 'other' {
  if (FAILED.test(message)) {
    return 'failed'
  }
  if (ESCALATE.test(message)) {
    return 'escalate'
  }
  if (RESOLVED.test(message)) {
    return 'resolved'
  }
  return 'other'
}

function bestArticle(text: string): Article | null {
  return rankArticles(text)[0] ?? null
}

function rankArticles(text: string): Article[] {
  const scored = ARTICLES.map((article) => ({ article, score: score(text, article) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.map((row) => row.article)
}

function score(text: string, article: Article): number {
  const haystack = normalize(text)
  let points = 0
  for (const keyword of article.keywords) {
    if (haystack.includes(normalize(keyword))) {
      points += 2
    }
  }
  if (haystack.includes(normalize(article.title))) {
    points += 3
  }
  return points
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

function number(items: string[]): string[] {
  return items.map((item, index) => `${index + 1}. ${item}`)
}
