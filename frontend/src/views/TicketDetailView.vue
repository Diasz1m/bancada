<template>
  <div v-if="tickets.current">
    <div class="page-head">
      <div>
        <p class="muted">Chamado #{{ tickets.current.id }}</p>
        <h1>{{ tickets.current.title }}</h1>
      </div>
      <StatusBadge :value="tickets.current.status" />
    </div>

    <div class="detail">
      <section class="card">
        <p>{{ tickets.current.description }}</p>
        <p class="muted">
          Aberto por {{ tickets.current.requester }} · prioridade
          {{ tickets.current.priority }}
        </p>

        <h2>Comentários</h2>
        <div class="comments">
          <p v-if="tickets.comments.length === 0" class="muted">Nenhum comentário ainda.</p>
          <article v-for="comment in tickets.comments" :key="comment.id" class="comment">
            <strong>{{ comment.author }}</strong>
            <time>{{ formatDate(comment.created_at) }}</time>
            <p>{{ comment.body }}</p>
          </article>
        </div>

        <form class="form" @submit.prevent="sendComment">
          <label>
            Novo comentário
            <textarea v-model="body" />
          </label>
          <button class="btn" :disabled="!body.trim()">Comentar</button>
        </form>
      </section>

      <aside class="card">
        <h2>Triagem</h2>
        <p class="muted">Só agente/admin altera status — o PHP devolve 403 para o resto.</p>
        <label>
          Status
          <select v-model="status" :disabled="!auth.isAgent" @change="save">
            <option value="aberto">Aberto</option>
            <option value="em_andamento">Em andamento</option>
            <option value="resolvido">Resolvido</option>
          </select>
        </label>
        <button
          v-if="auth.isAgent"
          class="btn secondary"
          type="button"
          @click="assignMe"
        >
          Atribuir a mim
        </button>
        <p class="muted">Responsável: {{ tickets.current.assignee || 'ninguém' }}</p>
        <p v-if="actionError" class="field-error">{{ actionError }}</p>
      </aside>
    </div>
  </div>
  <p v-else-if="tickets.loading" class="muted">Carregando…</p>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useTicketStore } from '../stores/tickets'
import StatusBadge from '../components/StatusBadge.vue'

const route = useRoute()
const auth = useAuthStore()
const tickets = useTicketStore()
const status = ref('aberto')
const body = ref('')
const actionError = ref('')

onMounted(() => load())
watch(() => route.params.id, () => load())
watch(
  () => tickets.current?.status,
  (value) => {
    if (value) status.value = value
  },
)

async function load() {
  await tickets.fetchOne(route.params.id)
  status.value = tickets.current.status
}

async function save() {
  actionError.value = ''
  try {
    await tickets.update(route.params.id, { status: status.value })
  } catch (err) {
    actionError.value = err.response?.data?.message || 'Não foi possível atualizar.'
    status.value = tickets.current.status
  }
}

async function assignMe() {
  actionError.value = ''
  try {
    await tickets.update(route.params.id, {
      status: status.value,
      assignee_id: auth.user.id,
    })
  } catch (err) {
    actionError.value = err.response?.data?.message || 'Não foi possível atribuir.'
  }
}

async function sendComment() {
  await tickets.addComment(route.params.id, body.value)
  body.value = ''
}

function formatDate(value) {
  return new Date(value).toLocaleString('pt-BR')
}
</script>
