<template>
  <section class="ai-chat">
    <header class="ai-head">
      <div>
        <h2>Assistente</h2>
        <p class="muted">{{ subtitle }}</p>
      </div>
      <span class="badge" :class="badgeClass">{{ badgeLabel }}</span>
    </header>

    <div ref="scroller" class="ai-thread">
      <p v-if="loading && messages.length === 0" class="muted">A assistente está lendo o chamado…</p>
      <article
        v-for="message in messages"
        :key="message.id"
        class="ai-bubble"
        :class="message.role"
      >
        <strong>{{ message.role === 'assistant' ? 'Assistente Bancada' : 'Você' }}</strong>
        <p>{{ message.body }}</p>
      </article>
    </div>

    <p v-if="error" class="field-error">{{ error }}</p>

    <form v-if="canChat" class="ai-compose" @submit.prevent="send">
      <div class="ai-quick">
        <button type="button" class="chip" :disabled="sending" @click="sendPreset('Não funcionou')">
          Não funcionou
        </button>
        <button type="button" class="chip" :disabled="sending" @click="sendPreset('Resolveu, obrigado')">
          Resolveu
        </button>
      </div>
      <textarea
        v-model="draft"
        :disabled="sending"
        placeholder="Descreva o que aconteceu depois dos passos…"
        @keydown.enter.exact.prevent="send"
      />
      <div class="ai-actions">
        <button class="btn" :disabled="sending || !draft.trim()">
          {{ sending ? 'Enviando…' : 'Enviar' }}
        </button>
        <button
          class="btn secondary"
          type="button"
          :class="{ glow: suggested === 'resolved' }"
          :disabled="sending"
          @click="resolve"
        >
          Isso resolveu
        </button>
        <button
          class="btn secondary"
          type="button"
          :class="{ glow: suggested === 'escalate' }"
          :disabled="sending"
          @click="escalate"
        >
          Falar com um agente
        </button>
      </div>
    </form>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useTicketStore } from '../stores/tickets'

const props = defineProps({
  ticketId: { type: [String, Number], required: true },
})

const auth = useAuthStore()
const tickets = useTicketStore()
const draft = ref('')
const sending = ref(false)
const error = ref('')
const scroller = ref(null)

const messages = computed(() => tickets.aiMessages)
const suggested = computed(() => tickets.aiSuggestion)
const outcome = computed(() => tickets.aiOutcome)
const loading = computed(() => tickets.aiLoading)

const canChat = computed(() => {
  const ticket = tickets.current
  if (!ticket || ticket.status === 'resolvido') return false
  if (outcome.value !== 'triagem') return false
  return auth.isAgent || ticket.requester_id === auth.user?.id
})

const subtitle = computed(() => {
  if (outcome.value === 'resolvido_ia') return 'Chamado fechado pela assistente.'
  if (outcome.value === 'escalado') return 'Histórico ficou no chamado para o agente.'
  if (tickets.current?.status === 'resolvido') return 'Chamado já resolvido.'
  return 'Primeiro atendimento automático, com procedimentos da TI.'
})

const badgeLabel = computed(() => {
  if (outcome.value === 'resolvido_ia') return 'resolvido pela IA'
  if (outcome.value === 'escalado') return 'com agente'
  return 'em triagem'
})

const badgeClass = computed(() => {
  if (outcome.value === 'resolvido_ia') return 'resolvido'
  if (outcome.value === 'escalado') return 'em_andamento'
  return 'aberto'
})

onMounted(() => load())
watch(() => props.ticketId, () => load())
watch(messages, () => scrollToEnd(), { deep: true })

async function load() {
  error.value = ''
  try {
    await tickets.fetchAi(props.ticketId)
  } catch (err) {
    error.value = err.response?.data?.message || 'Não foi possível abrir a assistente.'
  }
}

async function send() {
  const text = draft.value.trim()
  if (!text || sending.value) return
  await postMessage(text)
  draft.value = ''
}

async function sendPreset(text) {
  if (sending.value) return
  await postMessage(text)
}

async function postMessage(text) {
  sending.value = true
  error.value = ''
  try {
    await tickets.sendAi(props.ticketId, text)
  } catch (err) {
    error.value = err.response?.data?.message || 'A assistente não respondeu.'
  } finally {
    sending.value = false
  }
}

async function resolve() {
  sending.value = true
  error.value = ''
  try {
    await tickets.resolveWithAi(props.ticketId)
  } catch (err) {
    error.value = err.response?.data?.message || 'Não foi possível encerrar o chamado.'
  } finally {
    sending.value = false
  }
}

async function escalate() {
  sending.value = true
  error.value = ''
  try {
    await tickets.escalateAi(props.ticketId)
  } catch (err) {
    error.value = err.response?.data?.message || 'Não foi possível encaminhar.'
  } finally {
    sending.value = false
  }
}

async function scrollToEnd() {
  await nextTick()
  if (scroller.value) {
    scroller.value.scrollTop = scroller.value.scrollHeight
  }
}
</script>
