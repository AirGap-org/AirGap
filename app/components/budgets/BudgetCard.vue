<template>
  <div class="bg-neutral-50 dark:bg-neutral-800 p-4 border rounded-lg border-neutral-200 dark:border-neutral-750">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-lg font-medium text-neutral-800 dark:text-neutral-50">{{ budget.name }}</h3>

      <div class="flex items-center space-x-2">
        <Button class="cursor-pointer p-1 text-neutral-500 transition-colors rounded hover:text-primary-550" @click="$emit('edit', budget)">
          <span class="sr-only">Modifier</span>
          <SquarePen/>
        </Button>
        <Button class="cursor-pointer p-1 text-neutral-500 transition-colors rounded hover:text-red-500" @click="$emit('delete', budget)">
          <span class="sr-only">Supprimer</span>
          <TrashIcon/>
        </Button>
      </div>
    </div>

    <div class="text-sm text-neutral-600 dark:text-neutral-400 mb-2 flex flex-wrap gap-2">
      <span>Catégorie(s):
        <span v-if="budget.categories?.length" class="font-medium">
          {{ budget.categories.map(category => category.name).join(', ') }}
        </span>
        <span v-else class="font-medium italic">Aucune</span>
      </span>
      <span class="mx-2 hidden sm:inline">•</span>
      <span>Compte: <span class="font-medium">{{ budget.accountName || '—' }}</span></span>
      <span class="mx-2 hidden sm:inline">•</span>
      <span>Période: <span class="font-medium">{{ formatDateRange(budget.startDate, budget.endDate) }}</span></span>
    </div>

    <div class="mb-2 flex justify-between text-sm">
      <span class="text-neutral-700 dark:text-neutral-300">
        {{ formatCurrency(spent) }} dépensés sur {{ formatCurrency(budget.amount) }}
      </span>
      <span
          class="font-medium"
          :class="isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'"
      >
        {{ isOverBudget ? 'Dépassé de' : 'Reste' }}: {{ formatCurrency(Math.abs(Number(budget.amount) - spent)) }}
      </span>
    </div>

    <div class="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
      <div
          class="h-2 rounded-full transition-all duration-1000 ease-out"
          :class="isOverBudget ? 'bg-red-500' : 'bg-primary-600'"
          :style="{ width: animate ? `${progress}%` : '0%' }"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { SquarePen, TrashIcon } from 'lucide-vue-next'

const props = defineProps({
  budget: {
    type: Object,
    required: true
  },
  spent: {
    type: Number,
    default: 0
  },
  animate: Boolean
})

defineEmits(['edit', 'delete'])

const isOverBudget = computed(() => props.spent > Number(props.budget.amount))
const progress = computed(() => Math.min((props.spent / Number(props.budget.amount)) * 100, 100))

const formatCurrency = (amount) => new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR'
}).format(amount)

const formatDateRange = (startDate, endDate) =>
    `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
</script>
