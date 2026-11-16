<template>
  <div class="py-8">
    <div class="w-full">
      <div class="flex items-center justify-between mb-8 gap-4">
        <div>
          <h1 class="text-4xl font-black tracking-tighter">Budgets</h1>
        </div>

        <div class="flex items-center space-x-3">
          <Button
              class="cursor-pointer text-white border-neutral-200 dark:border-neutral-750 bg-primary-700 hover:bg-primary-500"
              @click="openAddBudgetModal()"
          >
            <svg
xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Nouveau budget
          </Button>
        </div>
      </div>

      <div class="card p-6 bg-white dark:bg-neutral-900 shadow-xl border-neutral-200 dark:border-neutral-750">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-medium text-neutral-900 dark:text-neutral-50">Mes Budgets</h2>
        </div>

        <div v-if="loading" class="flex justify-center my-8">
          <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"/>
        </div>

        <div v-else-if="budgets.length === 0" class="text-center py-8">
          <p class="text-neutral-600 dark:text-neutral-400">Aucun budget défini. Cliquez sur "Nouveau budget" pour
            commencer.</p>
        </div>

        <div v-else class="space-y-6">
           <BudgetCard
               v-for="budget in sortedBudgets"
               :key="budget.id"
               :budget="budget"
               :spent="getBudgetSpent(budget)"
               :animate="animateBars"
               @edit="editBudget"
               @delete="confirmDeleteBudget"
           />
        </div>
      </div>
    </div>

    <BudgetModal
        v-model="showBudgetModal"
        :budget="editingBudget"
        @budget-added="onBudgetSaved"
        @budget-updated="onBudgetSaved"
    />

  </div>
</template>

<script setup>
import {ref, computed, onMounted} from 'vue';
import BudgetCard from '~/components/budgets/BudgetCard.vue';

useHead({
  title: 'AirGap | Budgets',
})

definePageMeta({
  middleware: ['authenticated']
});

const loading = ref(true);
const budgets = ref([]);
const transactions = ref([]);
const showBudgetModal = ref(false);
const editingBudget = ref(null);
const animateBars = ref(false);

// --- Computed ---
const sortedBudgets = computed(() => {
  return [...budgets.value].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
});

// --- Chargement des données ---

const loadInitialData = async () => {
  loading.value = true;
  animateBars.value = false;

  try {
    const results = await Promise.allSettled([
      $fetch('/api/budgets'),
      $fetch('/api/transactions'),
    ]);

    const [budgetsResult, transResult] = results;

    if (budgetsResult.status === 'fulfilled') {
      budgets.value = budgetsResult.value.budgets || [];
    } else {
      console.error("Erreur chargement budgets:", budgetsResult.reason);
      budgets.value = [];
    }

    if (transResult.status === 'fulfilled') {
      transactions.value = transResult.value.transactions || [];
    } else {
      transactions.value = [];
    }

  } catch (err) {
    console.error('Erreur critique chargement:', err);
  } finally {
    loading.value = false;

    setTimeout(() => {
      animateBars.value = true;
    }, 50);
  }
};
// --- Logique Métier ---

const getBudgetSpent = (budget) => {
  if (!budget.categories || budget.categories.length === 0) return 0;

  const budgetCatIds = new Set(budget.categories.map(c => c.id));
  const start = new Date(budget.startDate);
  const end = new Date(budget.endDate);
  const relevantTransactions = transactions.value.filter(t => {
    const isExpense = t.typeTransaction === 'depense';
    const isCorrectCategory = budgetCatIds.has(t.categoryId);
    const tDate = new Date(t.date);
    const isInDateRange = tDate >= start && tDate <= end;
    return isExpense && isCorrectCategory && isInDateRange;
  });

  return relevantTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
};

// --- Gestion du Modal ---

const openAddBudgetModal = () => {
  editingBudget.value = null;
  showBudgetModal.value = true;
};

const editBudget = (budget) => {
  editingBudget.value = budget;
  showBudgetModal.value = true;
};

const onBudgetSaved = () => {
  loadInitialData();
};

// --- Suppression ---

const confirmDeleteBudget = async (budget) => {
  if (!confirm(`Supprimer le budget "${budget.name}" ?`)) return;

  try {
    await $fetch(`/api/budgets/${budget.id}`, {method: 'DELETE'});
    budgets.value = budgets.value.filter(b => b.id !== budget.id);
  } catch (err) {
    console.error('Erreur suppression:', err);
    alert("Impossible de supprimer");
  }
};

// Init
onMounted(() => {
  loadInitialData();
});
</script>
