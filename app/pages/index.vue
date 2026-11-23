<template>
  <div class="py-8">
    <div class="w-full">
      <div>
        <h1 class="text-4xl font-black tracking-tighter mb-10">Tableau de bord</h1>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div
            class="card p-4 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-750">
          <h3 class="text-lg font-medium mb-1">Patrimoine total</h3>
          <div v-if="loading" class="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"/>
          <p v-else class="text-3xl font-bold text-primary-550">{{ formatCurrency(balance) }}</p>

          <div v-if="!loading && balanceChange !== null" class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            <span :class="balanceChange >= 0 ? 'text-primary-550 dark:text-primary-550' : 'text-primary-550 dark:text-primary-550'">
              {{ formatPercent(balanceChange) }}
            </span> vs mois dernier
          </div>
        </div>

        <div
            class="card p-4 bg-white dark:bg-neutral-900 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-750">
          <h3 class="text-lg font-medium dark:text-neutral-300 mb-1">Revenus (ce mois)</h3>
          <div v-if="loading" class="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"/>
          <p v-else class="text-3xl font-bold text-primary-550 dark:text-primary-550">{{
              formatCurrency(monthlyIncome)
            }}</p>

          <div v-if="!loading && incomeChange !== null" class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            <span :class="incomeChange >= 0 ? 'text-primary-550 dark:text-primary-550' : 'text-red-500 dark:text-red-500'">
              {{ formatPercent(incomeChange) }}
            </span> vs mois dernier
          </div>
        </div>

        <div
            class="card p-4 bg-white dark:bg-neutral-900 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-750">
          <h3 class="text-lg font-medium text-neutral-700 dark:text-neutral-300 mb-1">Dépenses (ce mois)</h3>
          <div v-if="loading" class="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"/>
          <p v-else class="text-3xl font-bold text-red-500 dark:text-red-500">{{ formatCurrency(monthlyExpense) }}</p>

          <div v-if="!loading && expenseChange !== null" class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            <span :class="expenseChange <= 0 ? 'text-green-600 dark:text-green-600' : 'text-red-500 dark:text-red-500'">
              {{ formatPercent(expenseChange) }}
            </span> vs mois dernier
          </div>
        </div>
      </div>

      <div v-if="!loading && accounts.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div
            v-for="account in accounts"
            :key="account.id"
            class="card p-4 rounded-lg border border-neutral-200 dark:border-neutral-750 shadow-sm"
        >
          <p class="text-sm text-neutral-500 truncate">{{ account.name }}</p>
          <p class="text-xl font-bold text-neutral-900 dark:text-neutral-50">{{ formatCurrency(account.currentBalance) }}</p>
        </div>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-lg h-12 w-12 border-t-2 border-b-2 border-primary-600"/>
      </div>

      <reportsStats v-else />

    </div>
  </div>
</template>

<script setup>
import {computed} from 'vue';

useHead({
  title: 'AirGap | Accueil',
})


definePageMeta({
  middleware: ['authenticated']
});

const { data: dashboard, pending: loading } = useAsyncData(
    'dashboard',
    () => $fetch('/api/dashboard'),
    {
      lazy: true,
      server: true,
    }
);

const balance = computed(() => dashboard.value?.netWorth ?? 0)
const accounts = computed(() => dashboard.value?.accounts ?? [])
const monthlyIncome = computed(() => dashboard.value?.currentMonth.income ?? 0)
const monthlyExpense = computed(() => dashboard.value?.currentMonth.expense ?? 0)
const prevIncome = computed(() => dashboard.value?.previousMonth.income ?? 0)
const prevExpense = computed(() => dashboard.value?.previousMonth.expense ?? 0)

const incomeChange = computed(() => prevIncome.value === 0 ? null : ((monthlyIncome.value - prevIncome.value) / Math.abs(prevIncome.value)) * 100);
const expenseChange = computed(() => prevExpense.value === 0 ? null : ((monthlyExpense.value - prevExpense.value) / Math.abs(prevExpense.value)) * 100);
const balanceChange = computed(() => {
  const curBal = monthlyIncome.value - monthlyExpense.value;
  const prevBal = prevIncome.value - prevExpense.value;
  return prevBal === 0 ? null : ((curBal - prevBal) / Math.abs(prevBal)) * 100;
});

const formatCurrency = (val) => new Intl.NumberFormat('fr-FR', {style: 'currency', currency: 'EUR'}).format(val);
const formatPercent = (val) => {
  if (val === null) return '-';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(1)}%`;
};
</script>
