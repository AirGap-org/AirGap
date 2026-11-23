<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="fixed inset-0 dark:bg-neutral-900/60 backdrop-blur-sm" @click="closeModal"/>
    <Card class="w-full max-w-md mx-auto relative bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-500 dark:border-neutral-700">
      <CardHeader>
        <CardTitle>{{ isEditing ? 'Modifier le compte' : 'Nouveau compte' }}</CardTitle>
        <CardDescription>
          {{ isEditing ? 'Le solde initial ne peut plus être modifié.' : 'Le solde initial est définitif après création.' }}
        </CardDescription>
      </CardHeader>

      <form class="space-y-4" @submit.prevent="submitForm">
        <CardContent class="space-y-4">
          <div v-if="errorMessage" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
            {{ errorMessage }}
          </div>

          <Field>
            <FieldLabel for="accountName" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Nom du compte
            </FieldLabel>
            <Input
                id="accountName"
                v-model="form.accountName"
                type="text"
                required
                maxlength="255"
                placeholder="Ex: Compte courant, Livret A, PEA..."
                class="w-full px-3 py-2"
            />
          </Field>

          <Field>
            <FieldLabel for="accountType" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Type de compte
            </FieldLabel>
            <Select v-model="form.accountType">
              <SelectTrigger id="accountType" class="w-full">
                <SelectValue placeholder="Sélectionnez un type"/>
              </SelectTrigger>
              <SelectContent class="bg-white dark:bg-neutral-900">
                <SelectItem
                    v-for="type in ACCOUNT_TYPES"
                    :key="type"
                    :value="type"
                    class="cursor-pointer"
                >
                  {{ ACCOUNT_TYPE_LABELS[type] }}
                </SelectItem>
              </SelectContent>
            </Select>

            <Input
                v-if="form.accountType === 'autre'"
                v-model="form.accountTypeLabel"
                type="text"
                maxlength="255"
                required
                placeholder="Ex: Bourso, Caisse d'épargne..."
                class="w-full px-3 py-2 mt-2"
            />
          </Field>

          <Field v-if="!isEditing">
            <FieldLabel for="openingBalance" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Solde initial (optionnel)
            </FieldLabel>
            <Input
                id="openingBalance"
                v-model.number="form.openingBalance"
                type="number"
                step="0.01"
                placeholder="0.00"
                class="w-full px-3 py-2"
            />
          </Field>

          <p v-else class="text-sm text-neutral-500">
            Solde initial : {{ formatCurrency(account?.openingBalance ?? 0) }} (non modifiable)
          </p>
        </CardContent>

        <CardFooter class="gap-3">
          <Button type="button" class="w-full cursor-pointer" variant="outline" @click="closeModal">
            Annuler
          </Button>
          <Button type="submit" class="w-full cursor-pointer bg-primary-700 hover:bg-primary-500" :disabled="isLoading">
            {{ isLoading ? 'En cours...' : (isEditing ? 'Enregistrer' : 'Créer le compte') }}
          </Button>
        </CardFooter>
      </form>
    </Card>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS } from '~~/shared/accountTypes'

const props = defineProps({
  modelValue: Boolean,
  account: {
    type: Object,
    default: null
  }
})

const emits = defineEmits(['update:modelValue', 'account-added', 'account-updated'])

const isLoading = ref(false)
const errorMessage = ref('')
const isEditing = computed(() => Boolean(props.account?.id))
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emits('update:modelValue', value)
})

const form = ref({
  accountName: '',
  accountType: 'courant',
  accountTypeLabel: '',
  openingBalance: 0
})

watch(
    () => props.account,
    (account) => {
      if (account) {
        form.value = {
          accountName: account.accountName || '',
          accountType: account.accountType || 'courant',
          accountTypeLabel: account.accountTypeLabel || '',
          openingBalance: Number(account.openingBalance ?? 0)
        }
      } else {
        form.value = { accountName: '', accountType: 'courant', accountTypeLabel: '', openingBalance: 0 }
      }
      errorMessage.value = ''
    },
    { immediate: true }
)

const formatCurrency = (value) => new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR'
}).format(Number(value) || 0)

const closeModal = () => {
  isOpen.value = false
}

const submitForm = async () => {
  errorMessage.value = ''

  if (form.value.accountType === 'autre' && !form.value.accountTypeLabel.trim()) {
    errorMessage.value = 'Précisez le libellé du type de compte.'
    return
  }

  isLoading.value = true

  try {
    const body = {
      accountName: form.value.accountName,
      accountType: form.value.accountType,
      accountTypeLabel: form.value.accountType === 'autre' ? form.value.accountTypeLabel : null
    }

    if (isEditing.value) {
      await $fetch(`/api/accounts/${props.account.id}`, { method: 'PATCH', body })
      emits('account-updated')
    } else {
      await $fetch('/api/accounts', {
        method: 'POST',
        body: { ...body, openingBalance: Number(form.value.openingBalance) || 0 }
      })
      emits('account-added')
    }

    closeModal()
  } catch (error) {
    errorMessage.value = error?.data?.message || 'Erreur lors de l’enregistrement du compte.'
  } finally {
    isLoading.value = false
  }
}
</script>
