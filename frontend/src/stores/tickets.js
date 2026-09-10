import { defineStore } from 'pinia'
import { ref } from 'vue'
import { http } from '../api/http'

export const useTicketStore = defineStore('tickets', () => {
  const items = ref([])
  const current = ref(null)
  const comments = ref([])
  const aiMessages = ref([])
  const aiOutcome = ref('triagem')
  const aiSuggestion = ref(null)
  const stats = ref({ aberto: 0, em_andamento: 0, resolvido: 0, total: 0 })
  const loading = ref(false)
  const aiLoading = ref(false)

  async function fetchAll(status = 'todos') {
    loading.value = true
    try {
      const { data } = await http.get('/tickets', { params: { status } })
      items.value = data.tickets
    } finally {
      loading.value = false
    }
  }

  async function fetchStats() {
    const { data } = await http.get('/stats')
    stats.value = data
  }

  async function fetchOne(id) {
    loading.value = true
    try {
      const { data } = await http.get(`/tickets/${id}`)
      current.value = data.ticket
      comments.value = data.comments
    } finally {
      loading.value = false
    }
  }

  async function create(payload) {
    const { data } = await http.post('/tickets', payload)
    return data.ticket
  }

  async function update(id, payload) {
    const { data } = await http.patch(`/tickets/${id}`, payload)
    current.value = data.ticket
    return data.ticket
  }

  async function addComment(id, body) {
    await http.post(`/tickets/${id}/comments`, { body })
    await fetchOne(id)
  }

  function applyAiPayload(data) {
    if (data.ticket) {
      current.value = data.ticket
    }
    aiMessages.value = data.messages || []
    aiOutcome.value = data.outcome || 'triagem'
    aiSuggestion.value = data.suggested_action || null
  }

  async function fetchAi(id) {
    aiLoading.value = true
    try {
      const { data } = await http.get(`/tickets/${id}/ai`)
      applyAiPayload(data)
    } finally {
      aiLoading.value = false
    }
  }

  async function sendAi(id, message) {
    const { data } = await http.post(`/tickets/${id}/ai`, { message })
    applyAiPayload(data)
  }

  async function resolveWithAi(id) {
    const { data } = await http.post(`/tickets/${id}/ai/resolve`)
    applyAiPayload(data)
    await fetchOne(id)
  }

  async function escalateAi(id) {
    const { data } = await http.post(`/tickets/${id}/ai/escalate`)
    applyAiPayload(data)
    await fetchOne(id)
  }

  return {
    items,
    current,
    comments,
    aiMessages,
    aiOutcome,
    aiSuggestion,
    stats,
    loading,
    aiLoading,
    fetchAll,
    fetchStats,
    fetchOne,
    create,
    update,
    addComment,
    fetchAi,
    sendAi,
    resolveWithAi,
    escalateAi,
  }
})
