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

        <!-- Modal d'importation CSV -->
        <CsvImportModal :is-open="csvImportModalOpen" @update:isOpen="setCsvImportModalOpen"/>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import CsvImportModal from '~/components/CsvImportModal.vue';

// --- CONFIGURATION ---
definePageMeta({
  middleware: ['authenticated']
});

// --- STATE ---
const csvImportModalOpen = ref(false);

// --- ACTIONS ---
const openCsvImportModal = () => {
  csvImportModalOpen.value = true;
};

const setCsvImportModalOpen = (value) => {
  csvImportModalOpen.value = value;
};
</script>