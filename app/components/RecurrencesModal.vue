<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="fixed inset-0 dark:bg-neutral-900/60 backdrop-blur-sm" @click="closeModal"/>
    <Card class="w-full max-w-3xl mx-auto relative bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-500 dark:border-neutral-700 hover:shadow-md transition-shadow duration-300">
      <CardHeader>
        <CardTitle class="text-neutral-900 dark:text-neutral-50">Récurrences</CardTitle>
      </CardHeader>

      <CardContent>
        <div class="space-y-4">
          <div v-if="loadingRecurrences" class="text-sm text-neutral-500">Chargement...</div>

          <div v-else>
            <div v-if="recurrences.length === 0" class="text-sm text-neutral-500">Aucune récurrence trouvée.</div>

            <ul class="space-y-3">
              <li v-for="tx in recurrences" :key="tx.id" class="p-3 border rounded-md bg-white dark:bg-neutral-800 flex items-start justify-between">
                <div class="flex-1">
                  <div class="font-medium">{{ tx.description }}</div>
                  <div class="text-sm text-neutral-500">Montant: {{ tx.amount }} • Date: {{ formatDate(tx.date) }}</div>
                  <div class="text-sm text-neutral-500">Fréquence: <span class="font-medium">{{ tx.recurrence }}</span></div>
                  <div class="text-sm text-neutral-500">Du: {{ formatDate(tx.startRecurrence) }} <span v-if="tx.endRecurrence">au {{ formatDate(tx.endRecurrence) }}</span></div>
                </div>

                <div class="ml-4 flex-shrink-0 flex flex-col gap-2">
                  <Button class="cursor-pointer text-primary-50 bg-primary-500 hover:bg-primary-600 transition-colors" @click="startEdit(tx)">Modifier</Button>
                  <Button class="cursor-pointer text-black bg-red-600 hover:bg-red-700 transition-colors" @click="removeRecurrence(tx)">Supprimer</Button>
                </div>
              </li>
            </ul>

            <!-- édition inline -->
            <div v-if="editing" class="mt-4 p-3 border rounded-md bg-white dark:bg-neutral-800">
              <div class="grid grid-cols-3 gap-3 items-end">
                <div>
                  <Label class="block text-sm text-neutral-700">
                  <Select aria-label="Sélectionnez une fréquence" v-model="editForm.recurrenceToken" class="w-full mt-1 cursor-pointer">
                    <SelectTrigger class="cursor-pointer">
                      <SelectValue placeholder="Sélectionnez une fréquence" />
                    </SelectTrigger>
                  <SelectContent class="dark:bg-neutral-700 bg-white cursor-pointer">
                    <SelectItem class="hover:dark:bg-neutral-800 hover:bg-neutral-400 cursor-pointer" value="daily">Quotidienne</SelectItem>
                    <SelectItem class="hover:dark:bg-neutral-800 hover:bg-neutral-400 cursor-pointer" value="weekly">Hebdomadaire</SelectItem>
                    <SelectItem class="hover:dark:bg-neutral-800 hover:bg-neutral-400 cursor-pointer" value="monthly">Mensuelle</SelectItem>
                    <SelectItem class="hover:dark:bg-neutral-800 hover:bg-neutral-400 cursor-pointer" value="yearly">Annuelle</SelectItem>
                  </SelectContent>
                  </Select>
                    Fréquence
                  </Label>
                </div>
                <div>
                  <Label class="block text-sm text-neutral-700">
                  <Input aria-label="Début recurrence" type="date" v-model="editForm.startRecurrence" class="w-full mt-1 cursor-pointer" />
                    Début
                  </Label>
                </div>
                <div>
                  <Label class="block text-sm text-neutral-700">
                  <Input aria-label="Fin recurrence" type="date" v-model="editForm.endRecurrence" class="w-full mt-1 cursor-pointer" />
                    Fin (optionnel)
                  </Label>
                </div>
              </div>

              <div class="mt-3 flex gap-2">
                <Button class="cursor-pointer text-primary-50 bg-primary-500 hover:bg-primary-600 transition-colors" @click="saveEdit">Enregistrer</Button>
                <Button class="cursor-pointer border-primary-50 text-neutral-700 dark:text-neutral-300 bg-neutral-500 dark:bg-neutral-700 hover:dark:bg-neutral-600 hover:bg-neutral-400 transition-colors" @click="cancelEdit">Annuler</Button>
              </div>
            </div>

          </div>
        </div>
      </CardContent>

      <CardFooter class="gap-3">
        <Button type="button" class="w-full cursor-pointer text-white border-neutral-200 dark:border-neutral-750 bg-primary-700 hover:bg-primary-500" @click="closeModal">Fermer</Button>
      </CardFooter>
    </Card>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  isOpen: { type: Boolean, default: false }
});
const emit = defineEmits(['update:isOpen']);

const recurrences = ref([]);
const loadingRecurrences = ref(false);
const editing = ref(false);
const editForm = ref({ id: null, recurrenceToken: 'monthly', startRecurrence: undefined, endRecurrence: undefined });

const closeModal = () => emit('update:isOpen', false);

const formatDate = (d) => {
  if (!d) return '-';
  try { return new Date(d).toISOString().split('T')[0]; } catch (e) { return String(d); }
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

watch(() => props.isOpen, (v) => { if (v) fetchRecurrences(); });

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
  if (!editForm.value.startRecurrence) { alert('Le début de la récurrence est requis'); return; }
  const startIso = `${editForm.value.startRecurrence}T00:00:00.000Z`;
  const endIso = editForm.value.endRecurrence ? `${editForm.value.endRecurrence}T23:59:59.999Z` : null;
  if (endIso && new Date(startIso) > new Date(endIso)) { alert('La date de début doit être antérieure ou égale à la date de fin.'); return; }

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
