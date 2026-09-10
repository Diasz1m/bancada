import axios from 'axios'
import { useAuthStore } from '../stores/auth'

export const http = axios.create({
  baseURL: '/api',
})

http.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isLogin = error.config?.url?.includes('/login')
    if (error.response?.status === 401 && !isLogin) {
      const auth = useAuthStore()
      auth.clear()
      const { default: router } = await import('../router')
      if (router.currentRoute.value.name !== 'login') {
        await router.push({ name: 'login' })
      }
    }
    return Promise.reject(error)
  },
)
