<template>
  <div class="flex justify-center py-12">
    <Card class="w-full dark:bg-neutral-900 shadow-sm border border-gray-500 max-w-md">
      <CardHeader>
        <CardTitle>Vérification en deux étapes</CardTitle>
        <CardDescription>Entrez le code à 6 chiffres généré par votre application d'authentification</CardDescription>
      </CardHeader>

      <form @submit.prevent="handleVerify">
        <CardContent class="space-y-6">
          <div v-if="errorMessage" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {{ errorMessage }}
          </div>

          <div>
            <Label for="code" class="block mb-1">Code de vérification</Label>
            <Input
                id="code"
                v-model="code"
                type="text"
                inputmode="numeric"
                maxlength="6"
                required
                class="w-full px-3 py-2 dark:border-button-1 focus:outline-none focus:ring-2 focus:ring-button-3 transition-colors text-center text-2xl tracking-widest"
                placeholder="000000"
                autofocus
            />
          </div>
        </CardContent>

        <CardFooter class="flex flex-col">
          <Separator class="mt-5 mb-4 dark:bg-primary-50 bg-neutral-900" />
          <Button
              type="submit"
              :disabled="loading"
              class="w-full cursor-pointer text-primary-50 bg-primary-500 hover:bg-primary-600 focus:ring-primary-300 transition-colors"
          >
            {{ loading ? 'Vérification...' : 'Vérifier' }}
          </Button>
        </CardFooter>
      </form>
    </Card>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'AirGap | Vérification 2FA' })

const { fetch: refreshSession } = useUserSession()
const code = ref('')
const errorMessage = ref('')
const loading = ref(false)

async function handleVerify() {
  errorMessage.value = ''
  loading.value = true

  await $fetch('/api/auth/2fa/verify', {
    method: 'POST',
    body: { code: code.value }
  })
      .then(async () => {
        await refreshSession()
        await navigateTo('/')
      })
      .catch(() => {
        errorMessage.value = 'Code incorrect, réessayez.'
        code.value = ''
      })
      .finally(() => {
        loading.value = false
      })
}
</script>