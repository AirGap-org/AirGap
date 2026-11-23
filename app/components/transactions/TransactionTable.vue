<template>
  <div class="bg-white dark:bg-neutral-800 shadow-sm rounded-lg border border-neutral-200 dark:border-neutral-700">
    <div v-if="loading" class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"/>
    </div>

    <div v-else-if="transactions.length === 0" class="py-8 text-center text-neutral-500">
      <p>Aucune transaction enregistrée.</p>
    </div>

    <div v-else class="overflow-x-auto">
      <Table class="w-full" aria-label="Liste des transactions">
        <TableHeader>
          <TableRow class="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-750">
            <TableHead class="text-left py-3 px-4 text-neutral-700 dark:text-neutral-300 text-xs uppercase tracking-wider font-semibold">Date</TableHead>
            <TableHead class="text-left py-3 px-4 text-neutral-700 dark:text-neutral-300 text-xs uppercase tracking-wider font-semibold">Description</TableHead>
            <TableHead class="text-left py-3 px-4 text-neutral-700 dark:text-neutral-300 text-xs uppercase tracking-wider font-semibold">Compte</TableHead>
            <TableHead class="text-right py-3 px-4 text-neutral-700 dark:text-neutral-300 text-xs uppercase tracking-wider font-semibold">Montant</TableHead>
            <TableHead class="text-right py-3 px-4 text-neutral-700 dark:text-neutral-300 text-xs uppercase tracking-wider font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody class="divide-y divide-neutral-200 dark:divide-neutral-800">
          <TableRow
              v-for="transaction in transactions"
              :key="transaction.id"
              class="hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors"
          >
            <TableCell class="py-3 px-4 text-sm text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
              {{ formatDate(transaction.date) }}
            </TableCell>
            <TableCell class="py-3 px-4 text-sm text-neutral-800 dark:text-neutral-200">
              <div class="flex items-center">
                <span class="truncate max-w-[500px] sm:max-w-[700px]">{{ transaction.description }}</span>
                <span v-if="transaction.category" class="ml-2 text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-600">
                  {{ transaction.category }}
                </span>
              </div>
            </TableCell>
            <TableCell class="py-3 px-4 text-sm text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
              {{ transaction.accountName || '—' }}
            </TableCell>
            <TableCell
                class="py-3 px-4 text-sm text-right font-medium whitespace-nowrap"
                :class="getTransactionClass(transaction)"
            >
              {{ getTransactionSign(transaction) }} {{ formatCurrency(transaction.amount) }}
            </TableCell>
            <TableCell class="py-3 px-4 text-right whitespace-nowrap">
              <div class="flex justify-end space-x-2">
                <Button class="cursor-pointer p-1 text-neutral-500 transition-colors rounded hover:text-primary-550" @click="$emit('edit', transaction)">
                  <span class="sr-only">Modifier</span>
                  <SquarePen/>
                </Button>
                <Button class="cursor-pointer p-1 text-neutral-500 transition-colors rounded hover:text-red-500" @click="$emit('delete', transaction)">
                  <span class="sr-only">Supprimer</span>
                  <TrashIcon/>
                </Button>
                <Button class="cursor-pointer p-1 text-neutral-500 transition-colors rounded hover:text-primary-550" @click="$emit('magic', transaction)">
                  <span class="sr-only">Catégoriser</span>
                  <Sparkles/>
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>

<script setup>
import { SquarePen, TrashIcon, Sparkles } from 'lucide-vue-next'

defineProps({
  loading: Boolean,
  transactions: {
    type: Array,
    default: () => []
  }
})

defineEmits(['edit', 'delete', 'magic'])

const isIncome = (transaction) => transaction.typeTransaction === 'revenu'
const getTransactionClass = (transaction) => isIncome(transaction) ? 'text-primary-550' : 'text-red-500'
const getTransactionSign = (transaction) => isIncome(transaction) ? '+' : '-'

const formatCurrency = (amount) => new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 18
}).format(amount)

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(dateString))
}
</script>
