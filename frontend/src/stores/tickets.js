import { defineStore } from 'pinia'
import { ref } from 'vue'
import { http } from '../api/http'

export const useTicketStore = defineStore('tickets', () => {
  const items = ref([])
  const current = ref(null)
  const comments = ref([])
  const stats = ref({ aberto: 0, em_andamento: 0, resolvido: 0, total: 0 })
  const loading = ref(false)

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

  return { items, current, comments, stats, loading, fetchAll, fetchStats, fetchOne, create, update, addComment }
})
