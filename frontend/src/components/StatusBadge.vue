<template>
  <span class="badge" :class="value">{{ labels[value] || value }}</span>
</template>

<script setup>
defineProps({
  value: { type: String, required: true },
  labels: {
    type: Object,
    default: () => ({
      aberto: 'aberto',
      em_andamento: 'em andamento',
      resolvido: 'resolvido',
      baixa: 'baixa',
      media: 'média',
      alta: 'alta',
    }),
  },
})
</script>
