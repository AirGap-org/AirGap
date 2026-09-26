<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="fixed inset-0 dark:bg-neutral-900/60 backdrop-blur-sm" @click="closeModal"/>

    <Card
        class="w-full max-w-md mx-auto relative bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-500 dark:border-neutral-700 hover:shadow-md transition-shadow duration-300">
      <CardHeader>
        <CardTitle class="text-neutral-900 dark:text-white">
          {{ isEditing ? 'Modifier la transaction' : 'Nouvelle transaction' }}
        </CardTitle>
      </CardHeader>

      <form class="space-y-4" @submit.prevent="submitForm">
        <CardContent>
          <Field>
            <FieldLabel for="description" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Description
            </FieldLabel>
            <Input
                id="description"
                v-model="form.description"
                type="text"
                class="w-full px-3 py-2 dark:border-button-1 focus:outline-none focus:ring-1 focus:ring-button-3 transition-colors"
                placeholder="Ex: Salaire, Courses Leclerc, Loyer..."
                aria-label="Description de la transaction"
                required
            />
          </Field>
          <Field>
            <FieldLabel for="amount"
                        class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mt-2">Montant
            </FieldLabel>
            <div class="relative">
              <Input
                  id="amount"
                  v-model.number="form.amount"
                  type="number"
                  class="w-full px-3 py-2 dark:border-button-1 focus:outline-none focus:ring-1 focus:ring-button-3 transition-colors"
                  step="any"
                  placeholder="0.00"
                  aria-label="Montant de la transaction"
                  required
              />
              <span class="absolute right-10 top-1/2 transform -translate-y-1/2 text-neutral-500">€</span>
            </div>
          </Field>
          <Field>
            <RadioGroup v-model="form.type"
                        class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mt-4 mb-4">
              <div class="flex gap-3 mt-1">
                <RadioGroupItem
                    id="income-menu"
                    value="income"
                    class="mr-2"
                />
                <Label for="income-menu" class="text-primary-550 font-medium">Revenu</Label>
                <RadioGroupItem
                    id="expense-menu"
                    value="expense"
                    class="mr-2"
                />
                <Label for="expense-menu" class="text-red-500 font-medium">Dépense</Label>
              </div>
            </RadioGroup>
          </Field>
          <Field class="mb-3">
            <FieldLabel for="category"
                        class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Catégorie
            </FieldLabel>
            <Select
                v-model="form.categoryId"
                aria-label="Sélectionnez une catégorie"
            >
              <SelectTrigger
                  id="category"
                  class="w-full "
                  :disabled="isLoadingCategories"
                  required
              >
                <SelectValue placeholder="Sélectionnez une catégorie"/>
              </SelectTrigger>
              <SelectContent class="dark:bg-neutral-700 bg-white">
                <SelectItem class="hover:dark:bg-neutral-800 hover:bg-neutral-400 cursor-pointer"
                            v-for="cat in filteredCategories" :key="cat.id" :value="cat.id.toString()">
                  {{ cat.name }}
                </SelectItem>
              </SelectContent>
            </Select>

            <p v-if="filteredCategories.length === 0 && !isLoadingCategories" class="text-xs text-orange-500 mt-1">
              Aucune catégorie trouvée pour ce type.
            </p>
          </Field>

          <Field>
            <FieldLabel for="date"
                        class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Date
            </FieldLabel>
            <Popover>
              <PopoverTrigger as-child>
                <Button
                    variant="outline"
                    :class="cn(
          'w-[280px] justify-start text-left font-normal',
          !form.date && 'text-muted-foreground',
        )"
                >
                  <CalendarIcon class="mr-2 h-4 w-4"/>
                  {{ form.date ? form.date.toString() : "Sélectionnez une date" }}
                </Button>
              </PopoverTrigger>
              <PopoverContent class="w-auto p-0 dark:bg-neutral-700 bg-white" align="start">
                <Calendar
                    v-model="form.date"
                    class="cursor-pointer"
                />
              </PopoverContent>
            </Popover>
          </Field>
          <Field>
            <FieldLabel for="recurrence" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mt-3">
              Récurrence
            </FieldLabel>
            <div class="flex items-center gap-2">
              <Checkbox id="recurrence" v-model="isRecurrence" class="h-4 w-4 shrink-0"/>
              <Label for="recurrence" class="text-neutral-700 dark:text-neutral-300">Ajouter comme récurrence</Label>
            </div>

            <div v-if="isRecurrence" class="mt-2 space-y-2">
              <div>
                <FieldLabel for="recurrenceFrequency"
                            class="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Fréquence
                </FieldLabel>
                <Select v-model="form.recurrenceToken" aria-label="Sélectionnez une fréquence">
                  <SelectTrigger id="recurrenceFrequency" class="w-full">
                    <SelectValue placeholder="Sélectionnez une fréquence"/>
                  </SelectTrigger>
                  <SelectContent class="dark:bg-neutral-700 bg-white">
                    <SelectItem class="hover:dark:bg-neutral-800 hover:bg-neutral-400 cursor-pointer" value="daily">
                      Quotidienne
                    </SelectItem>
                    <SelectItem class="hover:dark:bg-neutral-800 hover:bg-neutral-400 cursor-pointer" value="weekly">
                      Hebdomadaire
                    </SelectItem>
                    <SelectItem class="hover:dark:bg-neutral-800 hover:bg-neutral-400 cursor-pointer" value="monthly">
                      Mensuelle
                    </SelectItem>
                    <SelectItem class="hover:dark:bg-neutral-800 hover:bg-neutral-400 cursor-pointer" value="yearly">
                      Annuelle
                    </SelectItem>
                  </SelectContent>
                </Select>

                <div class="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label class="block text-sm text-neutral-700 dark:text-neutral-300">
                    <Input aria-label="Début recurrence" type="date" v-model="form.startRecurrence" class="w-full mt-1"/>
                      Début
                    </label>
                  </div>
                  <div>
                    <label class="block text-sm text-neutral-700 dark:text-neutral-300">
                    <Input aria-label="Fin recurrence" type="date" v-model="form.endRecurrence" class="w-full mt-1"/>
                      Fin (optionnel)
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </Field>
          <Select>
            <SelectContent>
              <SelectItem class="hover:dark:bg-neutral-800 hover:bg-neutral-400 cursor-pointer" value="daily">
                Quotidienne
              </SelectItem>
              <SelectItem class="hover:dark:bg-neutral-800 hover:bg-neutral-400 cursor-pointer" value="weekly">
                Hebdomadaire
              </SelectItem>
              <SelectItem class="hover:dark:bg-neutral-800 hover:bg-neutral-400 cursor-pointer" value="monthly">
                Mensuelle
              </SelectItem>
              <SelectItem class="hover:dark:bg-neutral-800 hover:bg-neutral-400 cursor-pointer" value="yearly">Annuelle
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
        <CardFooter class="gap-3">
          <Button
              type="button"
              class="w-full cursor-pointer border-primary-50 text-neutral-700 dark:text-neutral-300 bg-neutral-500 dark:bg-neutral-700 hover:dark:bg-neutral-600 hover:bg-neutral-400 transition-colors"
              @click="closeModal"
          >
            Annuler
          </Button>
          <Button
              type="submit"
              class="w-full cursor-pointer text-primary-50 bg-primary-500 hover:bg-primary-600 transition-colors"
              :disabled="isLoading"
          >
            <span v-if="isLoading">En cours...</span>
            <span v-else>{{ isEditing ? 'Enregistrer' : 'Ajouter' }}</span>
          </Button>
        </CardFooter>
      </form>
    </Card>
  </div>
</template>

<script setup>
import {ref, onMounted, computed, watch} from 'vue';
import {SelectContent, SelectItem, SelectTrigger, SelectValue} from "~/components/ui/select/index.js";
import {CalendarIcon} from 'lucide-vue-next';
import {cn} from "~/lib/utils.ts";

// --- PROPS & EMITS ---
const props = defineProps({
  modelValue: Boolean,
  transaction: {
    type: Object,
    default: null
  }
});
const emits = defineEmits(['update:modelValue', 'transaction-added', 'transaction-updated']);

// --- STATE ---
const isLoading = ref(false);
const isLoadingCategories = ref(true);
const allCategories = ref([]);
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emits('update:modelValue', value)
});
const isRecurrence = ref(false);
const isEditing = computed(() => !!props.transaction);
const today = new Date().toISOString().split('T')[0];
const form = ref({
  description: '',
  amount: '',
  type: '',
  recurrence: false,
  recurrenceToken: 'none',
  categoryId: null,
  date: undefined,
  startRecurrence: undefined,
  endRecurrence: undefined,
});

// --- API : CHARGEMENT CATÉGORIES ---
onMounted(async () => {
  try {
    isLoadingCategories.value = true;
    const response = await $fetch('/api/categories');
    allCategories.value = response.categories || [];
  } catch (e) {
    console.error("Erreur lors du chargement des catégories:", e);
  } finally {
    isLoadingCategories.value = false;
  }
});

// --- COMPUTED : FILTRAGE ---
const filteredCategories = computed(() => {
  const currentEnum = form.value.type === 'income' ? 'revenu' : 'depense';
  return allCategories.value.filter(c => {
    return c.typeTransaction === currentEnum;
  });
});

// --- WATCHERS ---

watch(() => form.value.type, (newType, oldType) => {
  if (oldType && !props.transaction) {
    form.value.categoryId = null;
  } else if (oldType && props.transaction) {
    const initialType = props.transaction.typeTransaction === 'revenu' ? 'income' : 'expense';
    if (newType !== initialType) {
      form.value.categoryId = null;
    }
  }
});

watch(
    () => props.transaction,
    (newTransaction) => {
      if (newTransaction) {
        const formType = newTransaction.typeTransaction === 'revenu' ? 'income' : 'expense';
        let formattedDate = today;
        if (newTransaction.date) {
          formattedDate = new Date(newTransaction.date).toISOString().split('T')[0];
        }
        form.value = {
          description: newTransaction.description,
          amount: newTransaction.amount,
          type: formType,
          categoryId: newTransaction.categoryId || null,
          date: formattedDate,
          recurrence: newTransaction.recurrence && newTransaction.recurrence !== 'none',
          recurrenceToken: newTransaction.recurrence || 'none',
          startRecurrence: newTransaction.startRecurrence ? new Date(newTransaction.startRecurrence).toISOString().split('T')[0] : undefined,
          endRecurrence: newTransaction.endRecurrence ? new Date(newTransaction.endRecurrence).toISOString().split('T')[0] : undefined,
        };
        isRecurrence.value = form.value.recurrence;
      }
    },
    {immediate: true}
);

// --- SUBMIT ---
const validateRequiredFields = () => {
  if (!form.value.date) {
    alert("Attention la date n'est pas sélectionnée.");
    return false;
  }

  if (!form.value.categoryId) {
    alert("Attention la catégorie n'est pas sélectionnée.");
    return false;
  }

  if (!form.value.type) {
    alert("Attention le type n'est pas sélectionné.");
    return false;
  }

  return true;
};

const validateRecurrence = () => {
  const recurrenceToken = isRecurrence.value ? (form.value.recurrenceToken || 'monthly') : 'none';

  if (recurrenceToken === 'none') {
    return recurrenceToken;
  }

  if (!form.value.startRecurrence) {
    alert("Attention la date de début de récurrence n'est pas sélectionnée.");
    return null;
  }

  const start = new Date(form.value.startRecurrence);
  if (form.value.endRecurrence && start > new Date(form.value.endRecurrence)) {
    alert("La date de début de récurrence doit être antérieure à la date de fin.");
    return null;
  }

  return recurrenceToken;
};

const buildTransactionPayload = (recurrenceToken) => {
  const typeFormat = form.value.type === 'income' ? 'revenu' : 'depense';

  return {
    description: form.value.description,
    amount: Number(form.value.amount),
    date: form.value.date ? form.value.date.toString() : undefined,
    typeTransaction: typeFormat,
    categoryId: form.value.categoryId,
    recurrence: recurrenceToken,
    startRecurrence: form.value.startRecurrence ? new Date(form.value.startRecurrence).toISOString() : null,
    endRecurrence: form.value.endRecurrence ? new Date(form.value.endRecurrence).toISOString() : null,
    accountId: null
  };
};

const saveTransaction = async (payload) => {
  if (isEditing.value) {
    const response = await $fetch(`/api/transactions/${props.transaction.id}`, {
      method: 'PATCH',
      body: payload
    });
    emits('transaction-updated', response.transaction || response);
    return;
  }

  const response = await $fetch('/api/transactions', {
    method: 'POST',
    body: payload
  });
  emits('transaction-added', response.transaction || response);
};

const submitForm = async () => {
  if (!validateRequiredFields()) {
    return;
  }

  try {
    isLoading.value = true;

    const recurrenceToken = validateRecurrence();
    if (!recurrenceToken) {
      return;
    }

    const payload = buildTransactionPayload(recurrenceToken);
    await saveTransaction(payload);
    closeModal();
  } catch (error) {
    console.error('Erreur:', error);
    const message = error.response?._data?.statusMessage || error.message || "Erreur d'enregistrement";
    alert("Erreur : " + message);
  } finally {
    isLoading.value = false;
  }
};

// --- ACTIONS ---
const closeModal = () => {
  isOpen.value = false;
}
</script>