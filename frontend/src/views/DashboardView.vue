<template>
  <div>
    <div class="page-head">
      <div>
        <h1>Painel</h1>
        <p class="muted">Volume da fila nesta instância local.</p>
      </div>
      <router-link class="btn" :to="{ name: 'ticket-create' }">Abrir chamado</router-link>
    </div>

    <div class="grid-stats">
      <div class="stat">
        <b>{{ tickets.stats.total }}</b>
        total
      </div>
      <div class="stat">
        <b>{{ tickets.stats.aberto }}</b>
        abertos
      </div>
      <div class="stat">
        <b>{{ tickets.stats.em_andamento }}</b>
        em andamento
      </div>
      <div class="stat">
        <b>{{ tickets.stats.resolvido }}</b>
        resolvidos
      </div>
    </div>

    <h2>Recentes</h2>
    <p v-if="tickets.loading" class="muted">Carregando…</p>
    <table v-else class="table">
      <thead>
        <tr>
          <th>Chamado</th>
          <th>Status</th>
          <th>Prioridade</th>
          <th>Solicitante</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="ticket in tickets.items.slice(0, 5)" :key="ticket.id">
          <td>
            <router-link :to="{ name: 'ticket-detail', params: { id: ticket.id } }">
              {{ ticket.title }}
            </router-link>
          </td>
          <td><StatusBadge :value="ticket.status" /></td>
          <td><StatusBadge :value="ticket.priority" /></td>
          <td>{{ ticket.requester }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useTicketStore } from '../stores/tickets'
import StatusBadge from '../components/StatusBadge.vue'

const tickets = useTicketStore()

onMounted(async () => {
  await Promise.all([tickets.fetchStats(), tickets.fetchAll()])
})
</script>
