<template>
  <Card class="mb-3 bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-800 hover:shadow-md transition-shadow duration-300">
    <CardHeader>
      <CardTitle>Authentification à deux facteurs</CardTitle>
      <CardDescription>
        {{ twoFactorEnabled ? 'La 2FA est activée sur votre compte.' : 'Renforcez la sécurité de votre compte.' }}
      </CardDescription>
    </CardHeader>

    <CardContent class="space-y-6">
      <div v-if="errorMessage" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {{ errorMessage }}
      </div>
      <div v-if="successMessage" class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
        {{ successMessage }}
      </div>

      <div v-if="step === 'setup'" class="space-y-4">
        <p class="text-sm text-gray-500">Scannez ce QR code avec votre application (Google Authenticator, Authy...)</p>
        <div class="flex justify-center">
          <img :src="qrCode" alt="QR Code 2FA" class="w-48 h-48" >
        </div>
        <p class="text-sm text-center text-gray-500">
          Ou entrez ce code manuellement :
          <span class="font-mono font-bold text-xs block mt-1 break-all">{{ secret }}</span>
        </p>
        <div>
          <Label for="code" class="block mb-1">Entrez le code pour confirmer</Label>
          <Input
              id="code"
              v-model="code"
              type="text"
              inputmode="numeric"
              maxlength="6"
              class="w-full px-3 py-2 dark:border-button-1 focus:outline-none focus:ring-2 focus:ring-button-3 transition-colors text-center text-xl tracking-widest"
              placeholder="000000"
              autofocus
          />
        </div>
      </div>

      <div v-if="step === 'disable'" class="space-y-4">
        <p class="text-sm text-gray-500">Entrez votre code 2FA pour désactiver la vérification en deux étapes.</p>
        <div>
          <Label for="code-disable" class="block mb-1">Code de vérification</Label>
          <Input
              id="code-disable"
              v-model="code"
              type="text"
              inputmode="numeric"
              maxlength="6"
              class="w-full px-3 py-2 dark:border-button-1 focus:outline-none focus:ring-2 focus:ring-button-3 transition-colors text-center text-xl tracking-widest"
              placeholder="000000"
              autofocus
          />
        </div>
      </div>
    </CardContent>

    <CardFooter class="flex flex-col gap-2">
      <Separator class="mt-2 mb-4 dark:bg-primary-50 bg-neutral-900" />

      <template v-if="!twoFactorEnabled && step === 'idle'">
        <Button
            class="w-full cursor-pointer text-primary-50 bg-primary-500 hover:bg-primary-600 transition-colors"
            :disabled="loading"
            @click="startSetup"
        >
          {{ loading ? 'Chargement...' : 'Activer la 2FA' }}
        </Button>
      </template>

      <template v-if="step === 'setup'">
        <Button
            class="w-full cursor-pointer text-primary-50 bg-primary-500 hover:bg-primary-600 transition-colors"
            :disabled="loading"
            @click="handleEnable"
        >
          {{ loading ? 'Vérification...' : 'Confirmer l\'activation' }}
        </Button>
        <Button variant="outline" class="w-full cursor-pointer" @click="step = 'idle'">
          Annuler
        </Button>
      </template>

      <template v-if="twoFactorEnabled && step === 'idle'">
        <Button
            variant="outline"
            class="w-full cursor-pointer border-red-400 text-red-500 hover:bg-red-50"
            @click="step = 'disable'"
        >
          Désactiver la 2FA
        </Button>
      </template>

      <template v-if="step === 'disable'">
        <Button
            class="w-full cursor-pointer border-red-400 bg-red-500 hover:bg-red-600 text-white transition-colors"
            :disabled="loading"
            @click="handleDisable"
        >
          {{ loading ? 'Vérification...' : 'Confirmer la désactivation' }}
        </Button>
        <Button variant="outline" class="w-full cursor-pointer" @click="step = 'idle'">
          Annuler
        </Button>
      </template>
    </CardFooter>
  </Card>
</template>

<script setup lang="ts">
const { user, fetch: refreshSession } = useUserSession()

const step = ref<'idle' | 'setup' | 'disable'>('idle')
const twoFactorEnabled = ref(user.value?.twoFactorEnabled ?? false)
const qrCode = ref('')
const secret = ref('')
const code = ref('')
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

watch(
    () => user.value?.twoFactorEnabled,
    (enabled) => {
      if (typeof enabled === 'boolean') twoFactorEnabled.value = enabled
    }
)

async function startSetup() {
  errorMessage.value = ''
  loading.value = true

  await $fetch('/api/auth/2fa/setup', { method: 'POST' })
      .then((res: { qrCode: string; secret: string }) => {
        qrCode.value = res.qrCode
        secret.value = res.secret
        step.value = 'setup'
      })
      .catch(() => {
        errorMessage.value = 'Erreur lors de la génération du QR code.'
      })
      .finally(() => {
        loading.value = false
      })
}

async function handleEnable() {
  errorMessage.value = ''
  loading.value = true

  await $fetch('/api/auth/2fa/enable', {
    method: 'POST',
    body: { code: code.value }
  })
      .then(async () => {
        await refreshSession()
        twoFactorEnabled.value = true
        step.value = 'idle'
        code.value = ''
        successMessage.value = '2FA activée avec succès !'
      })
      .catch(() => {
        errorMessage.value = 'Code incorrect, réessayez.'
        code.value = ''
      })
      .finally(() => {
        loading.value = false
      })
}

async function handleDisable() {
  errorMessage.value = ''
  loading.value = true

  await $fetch('/api/auth/2fa/disable', {
    method: 'POST',
    body: { code: code.value }
  })
      .then(async () => {
        await refreshSession()
        twoFactorEnabled.value = false
        step.value = 'idle'
        code.value = ''
        successMessage.value = '2FA désactivée.'
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
