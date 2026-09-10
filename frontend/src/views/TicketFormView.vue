<template>
  <div>
    <div class="page-head">
      <div>
        <h1>Novo chamado</h1>
        <p class="muted">Validação 422 volta por campo — o mesmo contrato do FormRequest no Laravel.</p>
      </div>
    </div>

    <form class="form" @submit.prevent="submit">
      <p v-if="message" class="alert">{{ message }}</p>
      <label>
        Título
        <input v-model="title" />
        <span v-if="errors.title" class="field-error">{{ errors.title }}</span>
      </label>
      <label>
        Prioridade
        <select v-model="priority">
          <option value="baixa">Baixa</option>
          <option value="media">Média</option>
          <option value="alta">Alta</option>
        </select>
      </label>
      <label>
        Descrição
        <textarea v-model="description" />
        <span v-if="errors.description" class="field-error">{{ errors.description }}</span>
      </label>
      <button class="btn" :disabled="loading">{{ loading ? 'Enviando…' : 'Abrir chamado' }}</button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTicketStore } from '../stores/tickets'

const tickets = useTicketStore()
const router = useRouter()
const title = ref('')
const description = ref('')
const priority = ref('media')
const errors = ref({})
const message = ref('')
const loading = ref(false)

async function submit() {
  loading.value = true
  errors.value = {}
  message.value = ''
  try {
    const ticket = await tickets.create({
      title: title.value,
      description: description.value,
      priority: priority.value,
    })
    router.push({ name: 'ticket-detail', params: { id: ticket.id } })
  } catch (err) {
    errors.value = err.response?.data?.errors || {}
    message.value = err.response?.data?.message || 'Não foi possível abrir o chamado.'
  } finally {
    loading.value = false
  }
}
</script>
