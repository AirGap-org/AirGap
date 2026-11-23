<template>
  <div class="py-8">
    <div class="w-full">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 class="text-4xl font-black tracking-tighter">Transactions</h1>
        </div>

        <TransactionToolbar
            v-model:search-query="searchQuery"
            :is-parsing="isParsing"
            :is-predicting="isPredictingAll"
            :accounts="accounts"
            :selected-account-id="selectedAccountId"
            @update:selected-account-id="selectedAccountId = $event"
            @file-selected="handleFileUpload"
            @create="openTransactionModal"
            @predict-all="predictAllTransactions"
        />
      </div>

      <TransactionTable
          :loading="loading"
          :transactions="filteredTransactions"
          @edit="editTransaction"
          @delete="confirmDeleteTransaction"
          @magic="magicTransaction"
      />
    </div>

    <TransactionModal
        v-model="showTransactionModal"
        :transaction="selectedTransaction"
        @transaction-added="onTransactionSaved"
        @transaction-updated="onTransactionSaved"
    />
  </div>
</template>

<script setup>
import {ref, onMounted, computed} from 'vue';
import Papa from 'papaparse';
import TransactionToolbar from '~/components/transactions/TransactionToolbar.vue';
import TransactionTable from '~/components/transactions/TransactionTable.vue';

useHead({
  title: 'AirGap | Transactions',
})

const searchQuery = ref('');

const filteredTransactions = computed(() => {
  const all = transactions.value || [];
  if (!searchQuery.value.trim()) return all;

  const q = searchQuery.value.toLowerCase();

  return all.filter(t =>
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.category && t.category.toLowerCase().includes(q)) ||
      (t.amount && t.amount.toString().includes(q))
  );
});

// --- CONFIGURATION ---
definePageMeta({
  middleware: ['authenticated']
});

// --- ÉTAT ---
const isImporting = ref(false);
const isParsing = ref(false);
const isPredictingAll = ref(false);

const transactions = ref([]);
const accounts = ref([]);
const selectedAccountId = ref('');
const loading = ref(true);
const showTransactionModal = ref(false);
const selectedTransaction = ref(null);

// --- CHARGEMENT DONNÉES ---
const loadAccounts = async () => {
  const response = await $fetch('/api/accounts');
  accounts.value = response.accounts || [];
  if (!selectedAccountId.value) {
    selectedAccountId.value = accounts.value.find((account) => !account.isArchived)?.id || '';
  }
};

const loadTransactions = async () => {
  try {
    loading.value = true;
    const [response] = await Promise.all([
      $fetch('/api/transactions'),
      loadAccounts()
    ]);
    transactions.value = (response.transactions || []).map(t => ({
      ...t,
      category: t.category?.name || '',
      categoryId: t.category?.id || null,
      amount: Number(t.amount),
      typeTransaction: t.typeTransaction
    }));
  } catch (error) {
    console.error('Erreur chargement transactions:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadTransactions();
});

// --- IMPORT CSV : LECTURE + CLASSIFICATION ---
/**
 * Extrait et nettoie les données d'une ligne CSV brute.
 * (Niveau 1 de profondeur)
 */
const transformCSVRow = (row) => {
  const keys = Object.keys(row);
  const amountKey = keys.find(k => k.toLowerCase().includes('montant') || k.toLowerCase().includes('amount'));
  const dateKey = keys.find(k => k.toLowerCase().includes('date') && !k.toLowerCase().includes('valeur'));
  const descKey = keys.find(k => k.toLowerCase().includes('libell') || k.toLowerCase().includes('label'));

  const rawAmount = row[amountKey];
  const cleanAmount = typeof rawAmount === 'string'
      ? Number.parseFloat(rawAmount.replaceAll(/\s/g, '').replace(',', '.'))
      : Number(rawAmount);

  let cleanDate = new Date();
  if (dateKey && row[dateKey]) {
    const dateStr = row[dateKey];
    cleanDate = dateStr.includes('/')
        ? new Date(dateStr.split('/').reverse().join('-'))
        : new Date(dateStr);
  }

  return {
    date: cleanDate,
    description: descKey ? (row[descKey] || 'Import CSV') : 'Import CSV',
    amount: cleanAmount,
    accountId: selectedAccountId.value || null,
    selectedCategoryId: null,
    status: 'missing_category'
  };
};

/**
 * Version promisifiée de Papa.parse pour aplatir le flux asynchrone.
 */
const parseCSV = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "ISO-8859-1",
      worker: false,
      complete: resolve,
      error: reject
    });
  });
};

/**
 * Fonction principale simplifiée (Niveau 1).
 */
const handleFileUpload = async (file) => {
  if (!file) return;

  if (!selectedAccountId.value) {
    alert('Sélectionnez un compte avant d’importer un CSV.');
    return;
  }

  isParsing.value = true;

  try {
    await new Promise(resolve => setTimeout(resolve, 50));

    const results = await parseCSV(file);

    const formattedTransactions = results.data
        .filter(row => Object.keys(row).some(k =>
            k.toLowerCase().includes('montant') ||
            k.toLowerCase().includes('amount') ||
            k.toLowerCase().includes('solde')
        ))
        .map(transformCSVRow);

    const response = await $fetch('/api/transactions/classify', {
      method: 'POST',
      body: {transactions: formattedTransactions}
    });

    await saveTransactions(response.transactions);

  } catch (err) {
    console.error("Erreur mapping/classification:", err);
    alert(`Erreur: ${err.message}`);
  } finally {
    isParsing.value = false;
  }
};

// --- IMPORT CSV : SAUVEGARDE ---
const saveTransactions = async (data) => {
  if (!data || data.length === 0) {
    console.error("❌ Erreur : Tentative d'importation d'un tableau vide !");
    return;
  }

  try {
    isImporting.value = true;
    const response = await $fetch('/api/transactions/import', {
      method: 'POST',
      body: {transactions: data}
    });

    alert(`${response.count} transactions importées avec succès !`);
    await loadTransactions();

  } catch (err) {
    console.error("Erreur lors de la sauvegarde :", err);
    alert("Erreur lors de l'enregistrement des transactions.");
  } finally {
    isImporting.value = false;
  }
};

// --- CRUD UNITAIRE ---
const openTransactionModal = () => {
  selectedTransaction.value = null;
  showTransactionModal.value = true;
};

const editTransaction = (transaction) => {
  selectedTransaction.value = {...transaction};
  showTransactionModal.value = true;
};

const normalizeCategoryName = (value = '') => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const loadCategories = async () => {
  const categoriesResponse = await $fetch('/api/categories');
  return categoriesResponse.categories || [];
};

const findCategoryForPrediction = (allCategories, predictedCategory, typeTransaction) => {
  const wantedType = typeTransaction === 'revenu' ? 'revenu' : 'depense';
  const normalizedPrediction = normalizeCategoryName(predictedCategory);

  const existingCategory = allCategories.find(cat =>
      normalizeCategoryName(cat.name) === normalizedPrediction &&
      (cat.typeTransaction === wantedType || cat.typeTransaction === 'non_categorise')
  );

  if (existingCategory) {
    return existingCategory;
  }

  return allCategories.find(cat => {
    const normalizedName = normalizeCategoryName(cat.name);
    const predictionTokens = normalizedPrediction.split(/\s+/).filter(Boolean);
    const categoryTokens = normalizedName.split(/\s+/).filter(Boolean);
    if (!predictionTokens.length || !categoryTokens.length) return false;

    const overlap = predictionTokens.filter(token => categoryTokens.includes(token)).length;
    return overlap > 0 && (cat.typeTransaction === wantedType || cat.typeTransaction === 'non_categorise');
  }) || null;
};

const predictAllTransactions = async () => {
  const rows = transactions.value || [];
  if (!rows.length) {
    return;
  }

  isPredictingAll.value = true;
  let updatedCount = 0;

  try {
    const allCategories = await loadCategories();
    const candidates = rows.filter(transaction => transaction?.id)

    // Limite la charge sur le service IA et sur l'API interne.
    for (let i = 0; i < candidates.length; i += 3) {
      await Promise.all(candidates.slice(i, i + 3).map(async (transaction) => {
        try {
          const prediction = await $fetch('/api/transactions/predict', {
            method: 'POST',
            body: {
              libelle: transaction.description || '',
              montant: Number(transaction.amount ?? 0)
            }
          });

          const predictedCategoryName = prediction?.categorie || prediction?.category || prediction?.categoryName || prediction?.nomCategorie;
          if (!predictedCategoryName) {
            return;
          }

          const transactionType = transaction.typeTransaction === 'revenu' ? 'revenu' : 'depense';
          const category = findCategoryForPrediction(allCategories, predictedCategoryName, transactionType);

          if (!category) {
            return;
          }

          await $fetch(`/api/transactions/${transaction.id}`, {
            method: 'PATCH',
            body: {
              categoryId: category.id,
              typeTransaction: transactionType
            }
          });

          updatedCount++;
        } catch (error) {
          console.error(`Erreur de catégorisation pour ${transaction.id}:`, error);
        }
      }))
    }

    if (updatedCount === 0) {
      alert('Aucune transaction n\'a été prédite par l\'IA.');
    } else {
      alert(`${updatedCount} transactions ont été catégorisées par l'IA.`);
    }

    await loadTransactions();
  } catch (error) {
    console.error('Erreur prédiction automatique de toutes les transactions:', error);
    alert('Erreur lors de la prédiction automatique de toutes les transactions.');
  } finally {
    isPredictingAll.value = false;
  }
};

const magicTransaction = async (transaction) => {
  try {
    const prediction = await $fetch('/api/transactions/predict', {
      method: 'POST',
      body: {
        libelle: transaction.description || '',
        montant: Number(transaction.amount)
      }
    });

    const predictedCategoryName = prediction?.categorie || prediction?.category || prediction?.categoryName || prediction?.nomCategorie;
    if (!predictedCategoryName) {
      alert('Aucune catégorie prédite par l\'IA.');
      return;
    }

    const transactionType = transaction.typeTransaction === 'revenu' ? 'revenu' : 'depense';
    const allCategories = await loadCategories();
    const category = findCategoryForPrediction(allCategories, predictedCategoryName, transactionType);

    if (!category) {
      alert('Aucune catégorie existante correspondante n\'a été trouvée pour cette prédiction.');
      return;
    }

    await $fetch(`/api/transactions/${transaction.id}`, {
      method: 'PATCH',
      body: {
        categoryId: category.id,
        typeTransaction: transactionType
      }
    });

    await loadTransactions();
  } catch (error) {
    console.error('Erreur catégorisation automatique:', error);
    alert('Erreur catégorisation automatique.');
  }
};

const onTransactionSaved = () => {
  loadTransactions();
  showTransactionModal.value = false;
};

const confirmDeleteTransaction = async (transaction) => {
  if (confirm(`Supprimer "${transaction.description}" ?`)) {
    try {
      await $fetch(`/api/transactions/${transaction.id}`, {method: 'DELETE'});
      transactions.value = transactions.value.filter(t => t.id !== transaction.id);
    } catch (error) {
      alert("Erreur suppression.");
      console.log('erreur suppression transaction:', error);
    }
  }
};
</script>
<style>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 10px;
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: #262626;
}
</style>
