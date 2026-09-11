<template>
  <div class="py-8">
    <div class="max-w-6xl mx-auto">
      <div class="flex items-center justify-between mb-8">
        <h1 class="text-3xl font-bold text-neutral-900 dark:text-neutral-50">Paramètres</h1>
      </div>
      <div>
        <!-- Gestion des catégories -->
        <Item variant="outline" class="border-neutral-750 shadow-xl">
          <ItemContent class="flex flex-row w-full items-center justify-between">
            <div>
              <ItemTitle>Gestion des catégories</ItemTitle>
              <ItemDescription>Ajoutez, supprimez ou modifiez vos catégories.</ItemDescription>
            </div>
            <div>
              <ItemActions class="flex-row-reverse">
                <Button variant="outline" size="sm" class="cursor-pointer text-white border-neutral-200 dark:border-neutral-750 bg-primary-700 hover:bg-primary-500"
                        @click="() => navigateTo('/categories')"
                >
                  Gérer les catégories
                </Button>
              </ItemActions>
            </div>
          </ItemContent>
        </Item>

        <!-- Importation CSV -->
        <Item variant="outline" class="border-neutral-750 shadow-xl mt-6">
          <ItemContent class="flex flex-row w-full items-center justify-between">
            <div>
              <ItemTitle>Options des CSV</ItemTitle>
              <ItemDescription>Les options pour importer vos fichiers CSV de la banque.</ItemDescription>
            </div>
            <div>
              <ItemActions class="flex-row-reverse">
                <!-- Correcter l'événement émis -->
                <Button variant="outline" size="sm" class="cursor-pointer text-white border-neutral-200 dark:border-neutral-750 bg-primary-700 hover:bg-primary-500"
                        @click="openCsvImportModal"
                >
                  Paramètres d'importation
                </Button>
              </ItemActions>
            </div>
          </ItemContent>
        </Item>

        <!-- Récurrences (ouvrir modal) -->
        <Item variant="outline" class="border-neutral-750 shadow-xl mt-6">
          <ItemContent class="flex flex-row w-full items-center justify-between">
            <div>
              <ItemTitle>Récurrences</ItemTitle>
              <ItemDescription>Gérer, modifier ou supprimer vos transactions récurrentes.</ItemDescription>
            </div>
            <div>
              <ItemActions class="flex-row-reverse">
                <Button variant="outline" size="sm" class="cursor-pointer text-white border-neutral-200 dark:border-neutral-750 bg-primary-700 hover:bg-primary-500"
                        @click="openRecurrencesModal"
                >
                  Gérer les récurrences
                </Button>
              </ItemActions>
            </div>
          </ItemContent>
        </Item>

        <RecurrencesModal :is-open="recurrencesModalOpen" @update:isOpen="setRecurrencesModalOpen" />

        <!-- Modal d'importation CSV -->
        <CsvImportModal :is-open="csvImportModalOpen" @update:isOpen="setCsvImportModalOpen"/>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import CsvImportModal from '~/components/CsvImportModal.vue';
import RecurrencesModal from '~/components/RecurrencesModal.vue';

// --- CONFIGURATION ---
definePageMeta({
  middleware: ['authenticated']
});

// --- STATE ---
const csvImportModalOpen = ref(false);
const recurrencesModalOpen = ref(false);

// --- ACTIONS ---
const openCsvImportModal = () => {
  csvImportModalOpen.value = true;
};

const setCsvImportModalOpen = (value) => {
  csvImportModalOpen.value = value;
};

const openRecurrencesModal = () => { recurrencesModalOpen.value = true; };
const setRecurrencesModalOpen = (value) => { recurrencesModalOpen.value = value; };

const formatDate = (d) => {
  if (!d) return '-';
  try {
    return new Date(d).toISOString().split('T')[0];
  } catch (e) {
    return String(d);
  }
}

const fetchRecurrences = async () => {
  loadingRecurrences.value = true;
  try {
    const res = await $fetch('/api/transactions');
    if (res && res.transactions) {
      recurrences.value = res.transactions.filter(t => t.recurrence && t.recurrence !== 'none');
    }
  } catch (e) {
    console.error('Erreur fetch recurrences', e);
  } finally {
    loadingRecurrences.value = false;
  }
}

onMounted(() => {
  fetchRecurrences();
});

const startEdit = (tx) => {
  editing.value = true;
  editForm.value = {
    id: tx.id,
    recurrenceToken: tx.recurrence || 'monthly',
    startRecurrence: tx.startRecurrence ? new Date(tx.startRecurrence).toISOString().split('T')[0] : undefined,
    endRecurrence: tx.endRecurrence ? new Date(tx.endRecurrence).toISOString().split('T')[0] : undefined
  }
}

const cancelEdit = () => {
  editing.value = false;
  editForm.value = { id: null, recurrenceToken: 'monthly', startRecurrence: undefined, endRecurrence: undefined };
}

const saveEdit = async () => {
  if (!editForm.value.id) return;
  // Basic validation
  if (!editForm.value.startRecurrence) {
    alert('Le début de la récurrence est requis');
    return;
  }
  const startIso = `${editForm.value.startRecurrence}T00:00:00.000Z`;
  const endIso = editForm.value.endRecurrence ? `${editForm.value.endRecurrence}T23:59:59.999Z` : null;
  if (endIso && new Date(startIso) > new Date(endIso)) {
    alert('La date de début doit être antérieure ou égale à la date de fin.');
    return;
  }

  try {
    await $fetch(`/api/transactions/${editForm.value.id}`, {
      method: 'PATCH',
      body: {
        recurrence: editForm.value.recurrenceToken,
        startRecurrence: startIso,
        endRecurrence: endIso
      }
    });
    cancelEdit();
    await fetchRecurrences();
  } catch (e) {
    console.error('Erreur save recurrence', e);
    alert('Erreur lors de la sauvegarde');
  }
}

const removeRecurrence = async (tx) => {
  if (!confirm('Supprimer la récurrence pour cette transaction ?')) return;
  try {
    await $fetch(`/api/transactions/${tx.id}`, {
      method: 'PATCH',
      body: {
        recurrence: 'none',
        endRecurrence: null
      }
    });
    await fetchRecurrences();
  } catch (e) {
    console.error('Erreur suppression récurrence', e);
    alert('Erreur lors de la suppression');
  }
}
</script>