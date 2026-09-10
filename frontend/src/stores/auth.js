import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { http } from '../api/http'

const TOKEN_KEY = 'bancada.token'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) || '')
  const user = ref(null)

  const isAgent = computed(() => ['admin', 'agente'].includes(user.value?.role))

  async function login(email, password) {
    const { data } = await http.post('/login', { email, password })
    token.value = data.token
    user.value = data.user
    localStorage.setItem(TOKEN_KEY, data.token)
  }

  async function fetchMe() {
    const { data } = await http.get('/me')
    user.value = data.user
  }

  async function logout() {
    try {
      await http.post('/logout')
    } finally {
      clear()
    }
  }

  function clear() {
    token.value = ''
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
  }

  return { token, user, isAgent, login, fetchMe, logout, clear }
})
