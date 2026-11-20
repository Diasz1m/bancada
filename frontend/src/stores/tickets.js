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
  let activeTicketId = null
  let ticketSession = 0
  let detailRequest = 0
  let aiRequest = 0

  function selectTicket(id) {
    activeTicketId = id == null ? null : String(id)
    ticketSession++
    detailRequest++
    aiRequest++
    current.value = null
    comments.value = []
    aiMessages.value = []
    aiSuggestion.value = null
    aiOutcome.value = 'triagem'
    aiLoading.value = false
    loading.value = false
  }

  function isActive(id) {
    return activeTicketId === String(id)
  }

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
    if (!isActive(id)) return
    const request = ++detailRequest
    loading.value = true
    try {
      const { data } = await http.get(`/tickets/${id}`)
      if (isActive(id) && request === detailRequest) {
        current.value = data.ticket
        comments.value = data.comments
      }
    } finally {
      if (isActive(id) && request === detailRequest) loading.value = false
    }
  }

  async function create(payload) {
    const { data } = await http.post('/tickets', payload)
    return data.ticket
  }

  async function update(id, payload) {
    const session = ticketSession
    const { data } = await http.patch(`/tickets/${id}`, payload)
    if (isActive(id) && session === ticketSession) current.value = data.ticket
    return data.ticket
  }

  async function addComment(id, body) {
    const session = ticketSession
    await http.post(`/tickets/${id}/comments`, { body })
    if (session === ticketSession) await fetchOne(id)
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
    aiMessages.value = []
    aiSuggestion.value = null
    aiOutcome.value = current.value?.ai_outcome || 'triagem'
    const request = ++aiRequest
    aiLoading.value = true
    try {
      const { data } = await http.get(`/tickets/${id}/ai`)
      if (isActive(id) && request === aiRequest) applyAiPayload(data)
    } finally {
      if (isActive(id) && request === aiRequest) aiLoading.value = false
    }
  }

  async function sendAi(id, message) {
    const session = ticketSession
    const { data } = await http.post(`/tickets/${id}/ai`, { message })
    if (isActive(id) && session === ticketSession) applyAiPayload(data)
  }

  async function resolveWithAi(id) {
    const session = ticketSession
    const { data } = await http.post(`/tickets/${id}/ai/resolve`)
    if (isActive(id) && session === ticketSession) applyAiPayload(data)
    if (session === ticketSession) await fetchOne(id)
  }

  async function escalateAi(id) {
    const session = ticketSession
    const { data } = await http.post(`/tickets/${id}/ai/escalate`)
    if (isActive(id) && session === ticketSession) applyAiPayload(data)
    if (session === ticketSession) await fetchOne(id)
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
    selectTicket,
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
