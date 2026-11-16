<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="fixed inset-0 dark:bg-neutral-900/60 backdrop-blur-sm" @click="closeModal"/>
    <Card
        class="w-full max-w-md mx-auto relative bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-500 dark:border-neutral-700 hover:shadow-md transition-shadow duration-300">
      <CardHeader>
        <CardTitle class="text-neutral-900 dark:text-neutral-50">Paramètres d'importation CSV</CardTitle>
      </CardHeader>

      <CardContent>
        <div class="space-y-4">
          <p>Voici les formats à utiliser pour exporter vos transactions depuis votre banque :</p>

          <div class="border border-gray-300 p-4 rounded-lg bg-gray-100 dark:bg-neutral-800">
            <h3 class="text-xl font-bold">Format de fichier</h3>
            <p><strong>Excel 2000</strong></p>
          </div>

          <div class="border border-gray-300 p-4 rounded-lg bg-gray-100 dark:bg-neutral-800">
            <h3 class="text-xl font-bold">Format des dates</h3>
            <p><strong>Français long (JJ/MM/AAAA)</strong></p>
          </div>

          <div class="border border-gray-300 p-4 rounded-lg bg-gray-100 dark:bg-neutral-800">
            <h3 class="text-xl font-bold">Séparateur de champs</h3>
            <p><strong>Virgule (,)</strong></p>
          </div>

          <div class="border border-gray-300 p-4 rounded-lg bg-gray-100 dark:bg-neutral-800">
            <h3 class="text-xl font-bold">Montants sur</h3>
            <p><strong>Une seule colonne</strong></p>
          </div>

          <div class="border border-gray-300 p-4 rounded-lg bg-gray-100 dark:bg-neutral-800">
            <h3 class="text-xl font-bold">Séparateur décimal</h3>
            <p><strong>Point (.)</strong></p>
          </div>
        </div>
      </CardContent>

      <CardFooter class="gap-3">
        <Button
            type="button"
            class="w-full cursor-pointer text-white border-neutral-200 dark:border-neutral-750 bg-primary-700 hover:bg-primary-500"
            @click="closeModal"
        >
          Fermer
        </Button>
      </CardFooter>
    </Card>
  </div>
</template>

<script setup>
// --- PROPS ---
defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
});

// --- ÉMISSIONS ---
const emit = defineEmits(['update:isOpen']);

// --- ACTIONS ---
const closeModal = () => {
  emit('update:isOpen', false);
};
</script>