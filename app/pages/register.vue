<template>
  <div class="flex justify-center items-center py-12">
    <Card class="card w-full max-w-md dark:bg-neutral-900 shadow-sm border border-gray-500">
      <CardHeader>
        <div>
          <CardTitle class="text-neutral-900 dark:text-neutral-50">Créer un compte</CardTitle>
          <CardDescription class="text-neutral-600 dark:text-neutral-400 mt-2">Rejoignez AirGap pour gérer vos
            finances
          </CardDescription>
        </div>
      </CardHeader>
      <form @submit.prevent="handleRegister">
        <div v-if="errorMessage" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {{ errorMessage }}
        </div>
        <CardContent class="space-y-5">
          <div>
            <Label for="name" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Nom</Label>
            <Input
                id="name"
                v-model="form.name"
                type="text"
                required
                class="w-full px-3 py-2 dark:border-button-1 focus:outline-none focus:ring-2 focus:ring-button-3 transition-colors"
                placeholder="Votre nom"
            />
          </div>
          <div>
            <Label
                for="reg-email"
                class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Email</Label>
            <Input
                id="reg-email"
                v-model="form.email"
                type="email"
                required
                class="w-full px-3 py-2 dark:border-button-1 focus:outline-none focus:ring-2 focus:ring-button-3 transition-colors"
                placeholder="votre@email.com"
            />
          </div>
          <div>
            <Label for="reg-password" class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Mot
              de
              passe</Label>
            <Input
                id="reg-password"
                v-model="form.password"
                type="password"
                required
                class="w-full px-3 py-2 dark:border-button-1 focus:outline-none focus:ring-2 focus:ring-button-3 transition-colors"
                placeholder="8 caractères minimum"
                minlength="8"
            />
          </div>
          <div>
            <Label for="confirm-password" class="block text-sm mb-1">Confirmer
              le mot de passe</Label>
            <Input
                id="confirm-password"
                v-model="form.confirmPassword"
                type="password"
                required
                class="w-full px-3 py-2 dark:border-button-1 focus:outline-none focus:ring-2 focus:ring-button-3 transition-colors"
                placeholder="Confirmer votre mot de passe"
            />
          </div>
        </CardContent>
        <CardFooter class="flex flex-col">
          <Separator class="mt-5 mb-4 dark:bg-primary-50 bg-neutral-900" />

          <Button
              type="submit"
              class="w-full btn btn-primary flex justify-center cursor-pointer text-primary-50 bg-primary-500 hover:bg-primary-600 focus:ring-primary-300">
            Créer un compte
          </Button>

          <!-- Bouton Google -->
          <Button
              v-if="oauthProviders?.google"
              type="button"
              variant="outline"
              class="w-full cursor-pointer mt-2"
              @click="navigateTo('/auth/google', { external: true })"
          >
            <img src="https://www.google.com/favicon.ico" class="w-4 h-4 mr-2" alt="Google">
            S'enregistrer avec Google
          </Button>

          <!-- Bouton GitHub -->
          <Button
              v-if="oauthProviders?.github"
              type="button"
              variant="outline"
              class="w-full cursor-pointer mt-2"
              @click="navigateTo('/auth/github', { external: true })"
          >
            <img src="https://github.com/favicon.ico" class="w-4 h-4 mr-2" alt="GitHub" >
            S'enregistrer avec GitHub
          </Button>

          <Separator class="mt-5 mb-4 dark:bg-primary-50 bg-neutral-900" />
          <div class="flex items-center">
            <p>Vous avez déjà un compte ?</p>
            <Button class="hover:underline text-primary-500">
              <NuxtLink to="/login">Se
                connecter
              </NuxtLink>
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: ['guest']
})

useHead({
  title: "AirGap | S'enregistrer",
})

const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
});

const errorMessage = ref("");
const route = useRoute();
const router = useRouter();
const { fetch: refreshSession } = useUserSession();
const { data: oauthProviders } = await useFetch('/api/auth/providers');

if(route.query.error === 'wrong_provider') {
  errorMessage.value = 'Votre email est déjà utilisé pour un autre compte';
}

async function handleRegister() {
  if (form.password !== form.confirmPassword) {
    alert("Les mots de passe ne correspondent pas");
    return;
  }

  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: {
        name: form.name,
        email: form.email,
        password: form.password
      },
    })

    await refreshSession()
    await router.push('/')
  } catch (error) {
    errorMessage.value = error.data?.message || "Une erreur est survenue lors de l'inscription";
    console.error("Détails de l'erreur:", error.data);
  }
}
</script>
