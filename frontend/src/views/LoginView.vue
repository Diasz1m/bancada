<template>
  <div class="login">
    <section class="login-copy">
      <p class="brand">Bancada</p>
      <h1>A mesa de TI, sem o caos do e-mail.</h1>
      <p class="muted">
        Projeto de estudo Vue 3 + PHP para refrescar a stack da vaga: auth, CRUD,
        papéis e uma API JSON no mesmo formato que o Laravel usa.
      </p>
    </section>
    <section class="login-panel">
      <h2>Entrar</h2>
      <form class="form" @submit.prevent="submit">
        <p v-if="error" class="alert">{{ error }}</p>
        <label>
          E-mail
          <input v-model="email" type="email" autocomplete="username" />
        </label>
        <label>
          Senha
          <input v-model="password" type="password" autocomplete="current-password" />
        </label>
        <button class="btn" :disabled="loading">{{ loading ? 'Entrando…' : 'Entrar' }}</button>
      </form>
      <div class="accounts">
        ana@bancada.test / senha123 — agente<br />
        carlos@bancada.test / senha123 — solicitante<br />
        admin@bancada.test / senha123 — admin
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const email = ref('ana@bancada.test')
const password = ref('senha123')
const loading = ref(false)
const error = ref('')

async function submit() {
  loading.value = true
  error.value = ''
  try {
    await auth.login(email.value, password.value)
    router.push({ name: 'dashboard' })
  } catch (err) {
    error.value = err.response?.data?.message || 'Não foi possível entrar. A API está no ar?'
  } finally {
    loading.value = false
  }
}
</script>
