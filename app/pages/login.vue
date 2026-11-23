<template>
  <div class="flex justify-center py-12">
    <Card class="card w-full dark:bg-neutral-900 shadow-sm border border-gray-500 max-w-md">
      <CardHeader>
        <div>
          <CardTitle>Se connecter</CardTitle>
          <CardDescription>Accédez à votre tableau de bord</CardDescription>
        </div>
      </CardHeader>

      <form @submit.prevent="handleLogin">
        <div v-if="errorMessage" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {{ errorMessage }}
        </div>
        <CardContent class="space-y-6">
          <div>
            <Label for="email" class="block mb-1">Email</Label>
            <Input
                id="email"
                v-model="credentials.email"
                type="email"
                required
                class="w-full px-3 py-2 dark:border-button-1 focus:outline-none focus:ring-2 focus:ring-button-3 transition-colors"
                placeholder="votre@email.com"
            />
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <Label for="password" class="block">Mot de
                passe</Label>
            </div>
            <Input
                id="password"
                v-model="credentials.password"
                type="password"
                required
                class="w-full px-3 py-2 dark:border-button-1 focus:outline-none focus:ring-1 focus:ring-button-3 transition-colors"
                placeholder="••••••••"
            />
          </div>
        </CardContent>
        <CardFooter class="flex flex-col">
          <Separator class="mt-5 mb-4 dark:bg-primary-50 bg-neutral-900"/>

          <Button
              type="submit"
              class="w-full cursor-pointer text-primary-50 bg-primary-500 hover:bg-primary-600 focus:ring-primary-300 transition-colors"
          >
            Se connecter
          </Button>

          <!-- Bouton Google -->
          <Button
              type="button"
              variant="outline"
              class="w-full cursor-pointer mt-2"
              @click="navigateTo('/auth/google', { external: true })"
          >
            <img src="https://www.google.com/favicon.ico" class="w-4 h-4 mr-2" alt="Google">
            Continuer avec Google
          </Button>

          <!-- Bouton GitHub -->

          <Button
              type="button"
              variant="outline"
              class="w-full cursor-pointer mt-2"
              @click="navigateTo('/auth/github', { external: true })"
          >
            <img src="https://github.com/favicon.ico" class="w-4 h-4 mr-2" alt="GitHub" >
            Continuer avec GitHub
          </Button>

          <Separator class="mt-5 mb-4 dark:bg-primary-50 bg-neutral-900"/>

          <div class="flex items-center">
            <p>Pas encore de compte ?</p>
            <Button class="text-primary-500 hover:underline">
              <NuxtLink to="/register">
                Créer un compte
              </NuxtLink>
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['guest']
})

useHead({
  title: "AirGap | Se connecter",
})

const {fetch: refreshSession} = useUserSession()
const credentials = ref({
  email: '',
  password: '',
});

const errorMessage = ref("");
const route = useRoute();

if(route.query.error === 'wrong_provider') {
  errorMessage.value = 'Votre email est déjà utilisé pour un autre compte';
}

async function handleLogin() {
  await $fetch('/api/auth/login', {
    method: 'POST',
    body: {
      email: credentials.value.email,
      password: credentials.value.password,
    }
  })
      .then(async (res) => {
        if ('requiresTwoFactor' in res && res.requiresTwoFactor) {
          await navigateTo('/auth/2fa')
          return
        }
        await refreshSession()
        await navigateTo('/')
      })
      .catch((error) => {
        errorMessage.value = error?.data?.message || 'Email ou mot de passe incorrect'
      })
}
</script>
