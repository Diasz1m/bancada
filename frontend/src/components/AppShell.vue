<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        Bancada
        <span>chamados internos</span>
      </div>
      <nav class="nav">
        <router-link :to="{ name: 'dashboard' }">Painel</router-link>
        <router-link :to="{ name: 'tickets' }">Chamados</router-link>
        <router-link :to="{ name: 'ticket-create' }">Abrir chamado</router-link>
      </nav>
      <div class="user-box" v-if="auth.user">
        <strong>{{ auth.user.name }}</strong>
        {{ auth.user.role }}
        <button type="button" @click="sair">Sair</button>
      </div>
    </aside>
    <main class="main">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

async function sair() {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>
