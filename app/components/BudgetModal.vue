<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="fixed inset-0 dark:bg-neutral-900/60 backdrop-blur-sm" @click="closeModal"/>
    <Card
        class="w-full max-w-md mx-auto relative bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-500 dark:border-neutral-700 hover:shadow-md transition-shadow duration-300">
      <CardHeader>
        <CardTitle class="text-neutral-900 dark:text-neutral-50">
          {{ isEditing ? 'Modifier le budget' : 'Nouveau budget' }}
        </CardTitle>
      </CardHeader>

      <form class="space-y-4" @submit.prevent="submitForm">
        <CardContent>
          <Field>
            <FieldLabel
for="name"
                        class="text-neutral-700 dark:text-neutral-300">
              Nom
            </FieldLabel>
            <Input
                id="name"
                v-model="form.name"
                type="text"
                class="w-full px-3 py-2 dark:border-button-1 focus:outline-none transition-colors"
                placeholder="Ex: Courses mensuelles"
                required
            />
          </Field>

          <Field>
            <FieldLabel
for="amount"
                        class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mt-2">Montant
            </FieldLabel>
            <div class="relative">
              <Input
                  id="amount"
                  v-model.number="form.amount"
                  type="number"
                  class="w-full mb-2 px-3 py-2 dark:border-button-1 focus:outline-none transition-colors"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  required
              />
              <span class="absolute right-10 top-1/2 transform -translate-y-1/2 text-neutral-500">€</span>
            </div>
          </Field>

          <Field>
            <FieldLabel for="account" class="text-neutral-700 dark:text-neutral-300">
              Compte
            </FieldLabel>
            <Select v-model="form.accountId">
              <SelectTrigger id="account" class="w-full mb-2" required>
                <SelectValue placeholder="Sélectionnez un compte"/>
              </SelectTrigger>
              <SelectContent class="dark:bg-neutral-700 bg-white">
                <SelectItem
v-for="account in availableAccounts"
                            :key="account.id"
                            :value="account.id"
                            class="hover:dark:bg-neutral-800 hover:bg-neutral-400 cursor-pointer">
                  {{ account.accountName }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="availableAccounts.length === 0" class="text-xs text-red-500 mt-1">
              Créez d’abord un compte dans “Comptes”.
            </p>
          </Field>

          <Field>
            <FieldLabel for="category" class="text-neutral-700 dark:text-neutral-300">
              Catégorie à suivre
            </FieldLabel>
            <Select v-model="form.categoryId">
              <SelectTrigger
                  id="category"
                  class="w-full mb-2"
                  required>
                <SelectValue placeholder="Sélectionnez une catégorie"/>
              </SelectTrigger>
              <SelectContent class="dark:bg-neutral-700 bg-white">
                <SelectItem
v-for="cat in expenseCategories"
                            :key="cat.id" class="hover:dark:bg-neutral-800 hover:bg-neutral-400 cursor-pointer" :value="cat.id.toString()">
                  {{ cat.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel
for="period"
                        class="text-neutral-700 dark:text-neutral-300">Période
            </FieldLabel>
            <Select v-model="form.periodType" required>
              <SelectTrigger
                  id="period"
                  class="w-full mb-2"
                  required
              >
                <SelectValue placeholder="Sélectionnez la période"/>
              </SelectTrigger>
              <SelectContent class="bg-white dark:bg-neutral-900 dark:text-neutral-300 cursor-pointer">
                <SelectItem
                    class="hover:dark:bg-neutral-600 hover:bg-neutral-400 bg-white dark:bg-neutral-900 dark:text-neutral-300 cursor-pointer"
                    value="monthly">Ce mois-ci
                </SelectItem>
                <SelectItem
                    class="hover:dark:bg-neutral-600 hover:bg-neutral-400 bg-white dark:bg-neutral-900 dark:text-neutral-300 cursor-pointer"
                    value="yearly">Cette année
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>

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
import {endOfMonth, endOfYear, startOfMonth, startOfYear} from "date-fns";

// --- PROPS & EMITS ---
const props = defineProps({
  modelValue: Boolean,
  budget: {
    type: Object,
    default: null
  }
});
const emits = defineEmits(['update:modelValue', 'budget-added', 'budget-updated']);

// --- STATE ---
const isLoading = ref(false);
const isLoadingCategories = ref(true);
const allCategories = ref([]);
const allAccounts = ref([]);

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emits('update:modelValue', value)
});
const isEditing = computed(() => !!props.budget);

const form = ref({
  name: '',
  amount: '',
  accountId: '',
  categoryId: '',
  periodType: 'monthly'
});

// --- API : CHARGEMENT CATÉGORIES ---
onMounted(async () => {
  try {
    isLoadingCategories.value = true;
    const [categoriesResponse, accountsResponse] = await Promise.all([
      $fetch('/api/categories'),
      $fetch('/api/accounts')
    ]);
    allCategories.value = categoriesResponse.categories || categoriesResponse || [];
    allAccounts.value = accountsResponse.accounts || [];
    if (!form.value.accountId) {
      const defaultAccount = allAccounts.value.find((account) => !account.isArchived);
      form.value.accountId = defaultAccount?.id ?? '';
    }
  } catch (e) {
    console.error("Erreur chargement catégories/comptes:", e);
  } finally {
    isLoadingCategories.value = false;
  }
});

const availableAccounts = computed(() => allAccounts.value.filter((account) =>
    !account.isArchived || account.id === form.value.accountId
));

// --- COMPUTED : CATÉGORIES DÉPENSES ---
const expenseCategories = computed(() => {
  return allCategories.value.filter(c => {
    const type = c.type || c.typeTransaction;
    return type === 'depense';
  });
});

// --- WATCHERS (Pour l'édition) ---
watch(
    () => props.budget,
    (newBudget) => {
      if (newBudget) {
        const start = new Date(newBudget.startDate);
        const end = new Date(newBudget.endDate);
        const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
        const detectedPeriod = diffDays > 32 ? 'yearly' : 'monthly';

        form.value = {
          name: newBudget.name,
          amount: Number(newBudget.amount),
          accountId: newBudget.accountId || '',
          categoryId: newBudget.categories && newBudget.categories.length > 0 ? newBudget.categories[0].id.toString() : '',
          periodType: detectedPeriod
        };
      } else {
        form.value = {name: '', amount: '', accountId: allAccounts.value.find((account) => !account.isArchived)?.id ?? '', categoryId: '', periodType: 'monthly'};
      }
    },
    {immediate: true}
);

// --- SUBMIT ---
const submitForm = async () => {

  if (!form.value.accountId) {
    alert("Attention le compte n'est pas sélectionné.");
    return;
  }

  if (!form.value.categoryId) {
    alert("Attention la catégorie n'est pas sélectionnée.");
    return;
  }

  try {
    isLoading.value = true;
    const now = new Date();
    let startDate, endDate;

    if (form.value.periodType === 'monthly') {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    } else {
      startDate = startOfYear(now);
      endDate = endOfYear(now);
    }

    const payload = {
      name: form.value.name,
      amount: Number(form.value.amount),
      accountId: form.value.accountId,
      categoryIds: form.value.categoryId ? [form.value.categoryId] : [],
      startDate: startDate,
      endDate: endDate
    };

    let response;

    if (isEditing.value) {
      response = await $fetch(`/api/budgets/${props.budget.id}`, {
        method: 'PATCH',
        body: payload
      });
      emits('budget-updated', response.budget || response);
    } else {
      response = await $fetch('/api/budgets', {
        method: 'POST',
        body: payload
      });
      emits('budget-added', response.budget || response);
    }
    closeModal();
  } catch (error) {
    console.error('Erreur sauvegarde:', error);
    const message = error.response?._data?.statusMessage || error.message || "Erreur d'enregistrement";
    alert("Erreur : " + message);
  } finally {
    isLoading.value = false;
  }
};

// --- ACTIONS ---
const closeModal = () => {
  isOpen.value = false;
};
</script>