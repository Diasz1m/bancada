import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { guest: true },
    },
    {
      path: '/',
      component: () => import('../components/AppShell.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', name: 'dashboard', component: () => import('../views/DashboardView.vue') },
        { path: 'chamados', name: 'tickets', component: () => import('../views/TicketsView.vue') },
        { path: 'chamados/novo', name: 'ticket-create', component: () => import('../views/TicketFormView.vue') },
        { path: 'chamados/:id', name: 'ticket-detail', component: () => import('../views/TicketDetailView.vue') },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (auth.token && !auth.user) {
    try {
      await auth.fetchMe()
    } catch {
      auth.clear()
    }
  }

  if (to.matched.some((record) => record.meta.requiresAuth) && !auth.token) {
    return { name: 'login' }
  }

  if (to.matched.some((record) => record.meta.guest) && auth.token) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
