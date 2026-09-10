<template>
  <div>
    <div class="page-head">
      <div>
        <h1>Chamados</h1>
        <p class="muted">Filtro remoto: o PHP recebe o status, não só o Vue.</p>
      </div>
      <router-link class="btn" :to="{ name: 'ticket-create' }">Abrir chamado</router-link>
    </div>

    <div class="filters">
      <button
        v-for="option in statuses"
        :key="option.value"
        class="chip"
        :class="{ active: status === option.value }"
        type="button"
        @click="status = option.value"
      >
        {{ option.label }}
      </button>
    </div>

    <p v-if="tickets.loading" class="muted">Carregando…</p>
    <p v-else-if="tickets.items.length === 0" class="empty">Nenhum chamado neste filtro.</p>
    <table v-else class="table">
      <thead>
        <tr>
          <th>#</th>
          <th>Título</th>
          <th>Status</th>
          <th>Prioridade</th>
          <th>Responsável</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="ticket in tickets.items" :key="ticket.id">
          <td>{{ ticket.id }}</td>
          <td>
            <router-link :to="{ name: 'ticket-detail', params: { id: ticket.id } }">
              {{ ticket.title }}
            </router-link>
          </td>
          <td><StatusBadge :value="ticket.status" /></td>
          <td><StatusBadge :value="ticket.priority" /></td>
          <td>{{ ticket.assignee || '—' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useTicketStore } from '../stores/tickets'
import StatusBadge from '../components/StatusBadge.vue'

const tickets = useTicketStore()
const status = ref('todos')
const statuses = [
  { value: 'todos', label: 'Todos' },
  { value: 'aberto', label: 'Abertos' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'resolvido', label: 'Resolvidos' },
]

onMounted(() => tickets.fetchAll(status.value))
watch(status, (value) => tickets.fetchAll(value))
</script>
