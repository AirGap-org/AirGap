<template>
  <div class="py-8">
    <div class="w-full">

      <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <h1 class="text-3xl font-bold text-neutral-900 dark:text-neutral-50">Catégories</h1>

        <Button
            class="cursor-pointer text-white border-neutral-200 dark:border-neutral-750 bg-primary-700 hover:bg-primary-500"
            @click="openCategorieModal"
        >
          <PlusIcon class="h-4 w-4 mr-2 stroke-[3]"/>
          Nouvelle catégorie
        </Button>
      </div>

      <Card
          class="bg-neutral-50 dark:bg-neutral-800 p-4 border rounded-lg shadow-xl border-neutral-200 dark:border-neutral-750">

        <div v-if="loading" class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"/>
        </div>

        <div v-else-if="categories.length === 0" class="text-center py-12 text-neutral-500 dark:text-neutral-400">
          <p>Aucune catégorie trouvée. Créez votre première catégorie !</p>
        </div>

        <div v-else class="space-y-10">

          <section>
            <h2 class="text-xl font-semibold mb-4 text-neutral-900 dark:text-neutral-50">Mes catégories</h2>

            <div
v-if="userCategories.length > 0"
                 class="shadow-sm rounded-lg border border-neutral-200 dark:border-neutral-700 divide-y divide-neutral-200 dark:divide-neutral-700">
              <div
v-for="category in userCategories" :key="category.id"
                   class="flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">

                <div class="flex items-center gap-3">
                  <span class="font-medium text-neutral-900 dark:text-neutral-100">{{ category.name }}</span>
                  <span
class="text-xs px-2 py-0.5 rounded-full border"
                        :class="category.typeTransaction === 'revenu' ? 'bg-primary-550/15 text-primary-550 border-primary-550/40' : 'bg-red-500/15 text-red-500 border-red-500/40'">
                    {{ category.typeTransaction === 'revenu' ? 'Revenu' : 'Dépense' }}
                  </span>
                </div>

                <div class="flex items-center space-x-1">
                  <Button
variant="ghost" class="cursor-pointer p-2 h-auto text-neutral-500 hover:text-primary-550"
                          @click="editCategorie(category)">
                    <SquarePen class="h-4 w-4"/>
                  </Button>
                  <Button
variant="ghost" class="cursor-pointer p-2 h-auto text-neutral-500 hover:text-red-500"
                          @click="confirmDeleteCategorie(category)">
                    <TrashIcon class="h-4 w-4"/>
                  </Button>
                </div>
              </div>
            </div>

            <div
v-else
                 class="p-8 text-center border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-500">
              Vous n'avez pas encore de catégories personnelles.
            </div>
          </section>

          <hr class="border-neutral-200 dark:border-neutral-800">

          <section>
            <h2 class="text-xl font-semibold mb-4 text-neutral-500 dark:text-neutral-400">Catégories par défauts</h2>

            <div
                class="shadow-sm rounded-lg border border-neutral-200 dark:border-neutral-700 divide-y divide-neutral-200 dark:divide-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/20">
              <div
v-for="category in defaultCategories" :key="category.id"
                   class="flex items-center justify-between p-4 opacity-80">

                <div class="flex items-center gap-3">
                  <span class="font-medium text-neutral-700 dark:text-neutral-300">{{ category.name }}</span>
                  <span
                      class="text-xs px-2 py-0.5 rounded-full border border-neutral-300 dark:border-neutral-600 text-neutral-500">
                    {{
                      {
                        revenu: 'Revenu',
                        depense: 'Dépense',
                        non_categorise: 'Non catégorisé'
                      }[category.typeTransaction]
                    }}
                  </span>
                </div>

                <div class="text-xs text-neutral-400 italic">Système</div>
              </div>
            </div>
          </section>

        </div>
      </Card>
    </div>

    <CategorieModal
        v-model="showCategorieModal"
        :category="selectedCategorie"
        @category-added="onCategorieSaved"
        @category-updated="onCategorieSaved"
    />
  </div>
</template>

<script setup>
import {ref, onMounted} from 'vue';
import {PlusIcon, SquarePen, TrashIcon} from "lucide-vue-next";
import CategorieModal from '~/components/CategorieModal.vue';

useHead({
  title: 'AirGap | Catégories',
})

definePageMeta({
  middleware: ['authenticated']
});

// --- ÉTATS ---
const loading = ref(true);
const categories = ref([]);
const showCategorieModal = ref(false);
const selectedCategorie = ref(null);

// --- CHARGEMENT DES DONNÉES ---
const loadCategories = async () => {
  try {
    loading.value = true;
    const response = await $fetch('/api/categories');
    categories.value = response.categories || response || [];
  } catch (error) {
    console.error("Erreur lors du chargement des catégories:", error);
  } finally {
    loading.value = false;
  }
};

const defaultCategories = computed(() => {
  return categories.value.filter(cat => cat.isDefault === true);
});

const userCategories = computed(() => {
  return categories.value.filter(cat => !cat.isDefault);
});

onMounted(() => {
  loadCategories();
});

// --- ACTIONS MODAL ---
const openCategorieModal = () => {
  selectedCategorie.value = null;
  showCategorieModal.value = true;
};

const editCategorie = (category) => {
  selectedCategorie.value = {...category};
  showCategorieModal.value = true;
};

const onCategorieSaved = () => {
  loadCategories();
  showCategorieModal.value = false;
};

// --- SUPPRESSION ---
const confirmDeleteCategorie = async (category) => {
  if (!confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${category.name}" ?`)) return;

  try {
    await $fetch(`/api/categories/${category.id}`, {method: 'DELETE'});

    categories.value = categories.value.filter(c => c.id !== category.id);
  } catch (error) {
    console.error('Erreur lors de la suppression de la catégorie:', error);
    alert("Impossible de supprimer cette catégorie. Elle est peut-être utilisée par des transactions ou des budgets.");
  }
};
</script>
