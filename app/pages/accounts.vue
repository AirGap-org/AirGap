<template>
  <div class="py-8">
    <div class="w-full">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 class="text-4xl font-black tracking-tighter">Comptes</h1>
          <p class="text-neutral-500 mt-2">Patrimoine total : <strong>{{ formatCurrency(totalBalance) }}</strong></p>
        </div>
        <Button class="cursor-pointer text-white bg-primary-700 hover:bg-primary-500" @click="openCreateModal">
          Ajouter un compte
        </Button>
      </div>

      <div v-if="pending" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"/>
      </div>

      <Alert v-else-if="error" class="p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm mb-4">
        Erreur lors du chargement des comptes.
      </Alert>

      <div v-else-if="accounts.length === 0" class="card p-8 text-center text-neutral-500">
        Aucun compte. Créez votre premier compte pour commencer.
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
            v-for="account in accounts"
            :key="account.id"
            class="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-750 shadow-xl"
            :class="{ 'opacity-60': account.isArchived }"
        >
          <CardHeader class="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle class="text-neutral-900 dark:text-neutral-50">
                {{ account.accountName }}
                <span v-if="account.isArchived" class="ml-2 text-xs font-normal text-neutral-500">(archivé)</span>
              </CardTitle>
              <CardDescription>{{ getAccountTypeLabel(account.accountType, account.accountTypeLabel) }}</CardDescription>
            </div>
            <p class="text-2xl font-bold text-primary-550 whitespace-nowrap">{{ formatCurrency(account.currentBalance) }}</p>
          </CardHeader>
          <CardContent class="text-sm text-neutral-500">
            Solde initial : {{ formatCurrency(account.openingBalance) }}
          </CardContent>
          <CardFooter class="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" class="cursor-pointer" @click="openEditModal(account)">
              Modifier
            </Button>
            <Button variant="outline" size="sm" class="cursor-pointer" @click="toggleArchive(account)">
              {{ account.isArchived ? 'Désarchiver' : 'Archiver' }}
            </Button>
            <Button variant="outline" size="sm" class="cursor-pointer text-red-500" @click="deleteAccount(account)">
              Supprimer
            </Button>
          </CardFooter>
        </Card>
      </div>

      <AccountModal
          v-model="showModal"
          :account="selectedAccount"
          @account-added="refresh"
          @account-updated="refresh"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import AccountModal from '~/components/AccountModal.vue'
import { getAccountTypeLabel } from '~~/shared/accountTypes'

definePageMeta({ middleware: ['authenticated'] })
useHead({ title: 'AirGap | Comptes' })

const showModal = ref(false)
const selectedAccount = ref(null)

const { data, pending, error, refresh } = await useFetch('/api/accounts')
const accounts = computed(() => data.value?.accounts ?? [])
const totalBalance = computed(() =>
    accounts.value.reduce((sum, account) => sum + Number(account.currentBalance || 0), 0)
)

const formatCurrency = (value) => new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR'
}).format(Number(value) || 0)

const openCreateModal = () => {
  selectedAccount.value = null
  showModal.value = true
}

const openEditModal = (account) => {
  selectedAccount.value = { ...account }
  showModal.value = true
}

const toggleArchive = async (account) => {
  try {
    await $fetch(`/api/accounts/${account.id}`, {
      method: 'PATCH',
      body: { isArchived: !account.isArchived }
    })
    await refresh()
  } catch (err) {
    alert(err?.data?.message || 'Impossible de modifier l’archivage.')
  }
}

const deleteAccount = async (account) => {
  if (!confirm(`Supprimer le compte "${account.accountName}" ?`)) return

  try {
    await $fetch(`/api/accounts/${account.id}`, { method: 'DELETE' })
    await refresh()
  } catch (err) {
    alert(err?.data?.message || 'Impossible de supprimer ce compte.')
  }
}
</script>
