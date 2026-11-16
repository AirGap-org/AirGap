<template>
  <div class="py-8">
    <div class="w-full">
      <h1 class="text-3xl font-bold mb-6 text-neutral-900 dark:text-neutral-50">Profil utilisateur</h1>
      <Alert v-if="error" class="p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm mb-4">
        {{ error }}
      </Alert>
      <Alert v-if="success" class="p-3 bg-green-100 border border-green-200 text-primary-550 rounded-lg text-sm mb-4">
        {{ success }}
      </Alert>

      <form @submit.prevent="updateProfile">
        <Card
            class="mb-3 bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-800 hover:shadow-md transition-shadow duration-300">
          <CardHeader>
            <CardTitle>Profil</CardTitle>
            <CardDescription>Gérez votre identité sur la plateforme.</CardDescription>
          </CardHeader>
          <CardContent>
            <Field>
              <FieldLabel class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Nom
                <Input
                    id="name"
                    v-model="profileForm.name"
                    type="text"
                    class="w-full mt-1 px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-600"
                />
              </FieldLabel>
            </Field>

          </CardContent>
          <CardFooter>
            <Button type="button"
                    class="cursor-pointer border hover:text-neutral-600 text-neutral-700 dark:text-neutral-300 mr-2"
                    @click="resetProfileForm">Annuler
            </Button>
            <Button type="submit" class="cursor-pointer border hover:text-primary-600 text-primary-550"
                    :disabled="!isProfileValid || isLoading">
              <span v-if="isLoading">Chargement...</span>
              <span v-else>Enregistrer</span>
            </Button>
          </CardFooter>
        </Card>
      </form>

      <div v-if="authProvider === 'local'">
        <form @submit.prevent="updateEmail">
          <Card
              class="mb-3 bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-800 hover:shadow-md transition-shadow duration-300">
            <CardHeader>
              <CardTitle>Email</CardTitle>
              <CardDescription>Mettez a jour l'adresse email de votre compte.</CardDescription>
            </CardHeader>
            <CardContent>
              <Field>
                <FieldLabel class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Email
                  <Input
                      v-model="emailForm.email"
                      type="email"
                      class="w-full mt-1 px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-600"
                      placeholder="nom@domaine.com"
                  />
                </FieldLabel>
              </Field>
            </CardContent>
            <CardFooter>
              <Button type="button"
                      class="cursor-pointer border hover:text-neutral-600 text-neutral-700 dark:text-neutral-300 mr-2"
                      @click="resetEmailForm">Annuler
              </Button>
              <Button type="submit" class="cursor-pointer border hover:text-primary-600 text-primary-550"
                      :disabled="!isEmailValid || isLoading">
                <span v-if="isLoading">Chargement...</span>
                <span v-else>Enregistrer</span>
              </Button>
            </CardFooter>
          </Card>
        </form>

        <form @submit.prevent="updatePassword">
          <Card
              class="mb-3 bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-800 hover:shadow-md transition-shadow duration-300">
            <CardHeader>
              <CardTitle>Mot de passe</CardTitle>
              <CardDescription>Mettez à jour votre mot de passe pour sécuriser votre compte.</CardDescription>
            </CardHeader>

            <CardContent>
              <Field>
                <FieldLabel class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Mot de passe actuel
                  <Input
                      v-model="passwordForm.currentPassword"
                      type="password"
                      class="w-full mt-1 px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-600"
                      placeholder="Requis pour changer le mot de passe"
                  />
                </FieldLabel>
              </Field>
              <Field>
                <FieldLabel class="block text-sm font-medium  text-neutral-700 dark:text-neutral-300 mb-1">
                  Nouveau mot de passe
                  <Input
                      v-model="passwordForm.newPassword"
                      type="password"
                      class="w-full mt-1 px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-600"
                      placeholder="Min. 8 caractères"
                  />
                </FieldLabel>
              </Field>
              <Field>
                <FieldLabel class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Confirmer le mot de passe
                  <Input
                      v-model="passwordForm.confirmPassword"
                      type="password"
                      class="w-full mt-1 px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-600"
                      :class="{'border-red-500': passwordForm.newPassword !== passwordForm.confirmPassword && passwordForm.confirmPassword}"
                  />
                </FieldLabel>
              </Field>
            </CardContent>
            <CardFooter>
              <Button type="button"
                      class="cursor-pointer border hover:text-neutral-600 text-neutral-700 dark:text-neutral-300 mr-2"
                      @click="resetPasswordForm">Annuler
              </Button>
              <Button type="submit" class="cursor-pointer border rounded hover:text-primary-600 text-primary-550"
                      :disabled="!isPasswordValid || isLoading">
                <span v-if="isLoading">Chargement...</span>
                <span v-else>Enregistrer</span>
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>

      <TwoFactorSettings v-if="authProvider === 'local'" class="mb-3"/>

      <Card
          class="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-800 hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Gestion du compte</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
          <Button
              class="w-full md:hidden cursor-pointer border hover:text-neutral-600 text-neutral-700 dark:text-neutral-300"
              :disabled="isLoading"
              @click="logout"
          >
            <span v-if="isLoading">Déconnexion...</span>
            <span v-else>Se déconnecter</span>
          </Button>

          <Separator class="my-2 md:hidden dark:bg-primary-50 bg-neutral-900" />

          <div class="flex flex-col gap-2">
            <p class="text-sm font-medium text-red-600 dark:text-red-400">Zone dangereuse</p>
            <AlertDialog v-model:open="isDeleteDialogOpen">
              <AlertDialogTrigger asChild>
                <Button class="w-full cursor-pointer bg-red-600 hover:bg-red-700 text-white border border-red-700" variant="destructive">
                  Supprimer mon compte
                </Button>
              </AlertDialogTrigger>

            <!-- Compte local : demande le mot de passe -->
            <AlertDialogContent v-if="authProvider === 'local'"
                                class="bg-white dark:bg-neutral-900/60 backdrop-blur-sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Pour confirmer, veuillez saisir votre mot de passe actuel.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div class="my-4">
                <Input
                    v-model="passwordForDeletion"
                    type="password"
                    placeholder="Votre mot de passe actuel"
                />
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel class="border cursor-pointer hover:text-neutral-600"
                                   @click="passwordForDeletion = ''">
                  Annuler
                </AlertDialogCancel>
                <Button
                    variant="destructive"
                    class="border cursor-pointer hover:text-primary-600 text-primary-550"
                    :disabled="!passwordForDeletion || isLoading"
                    @click="confirmDeleteAccount"
                >
                  <span v-if="isLoading">Suppression...</span>
                  <span v-else>Confirmer la suppression</span>
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>

            <!-- Compte OAuth : simple confirmation -->
            <AlertDialogContent v-else class="bg-white dark:bg-neutral-900/60 backdrop-blur-sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Votre compte sera définitivement supprimé.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel class="border cursor-pointer hover:text-neutral-600">
                  Annuler
                </AlertDialogCancel>
                <Button
                    variant="destructive"
                    class="border cursor-pointer hover:text-primary-600 text-primary-550"
                    :disabled="isLoading"
                    @click="confirmDeleteAccount"
                >
                  <span v-if="isLoading">Suppression...</span>
                  <span v-else>Oui, supprimer mon compte</span>
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import {z} from 'zod'
import {Alert} from "~/components/ui/alert";
import {AlertDialog, AlertDialogFooter, AlertDialogHeader} from "~/components/ui/alert-dialog";
import TwoFactorSettings from "~/components/TwoFactorSettings.vue";

const getErrorMessage = (err: unknown, fallback: string) => {
  if (typeof err === 'object' && err !== null && 'data' in err) {
    const data = (err as { data?: { message?: string } }).data
    if (data?.message) return data.message
  }
  return fallback
}

useHead({
  title: 'AirGap | Profil',
})

definePageMeta({
  middleware: ['authenticated'],
})

const {user, clear, fetch: refreshSession} = useUserSession()
const isLoading = ref(false)
const error = ref('')
const success = ref('')
const isDeleteDialogOpen = ref(false)
const passwordForDeletion = ref('')
const authProvider = ref("")

const profileForm = ref({
  name: '',
})

const emailForm = ref({
  email: ''
})

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

watchEffect(() => {
  if (user.value) {
    profileForm.value.name = user.value.name || ''
    emailForm.value.email = user.value.email || ''
    authProvider.value = user.value.authProvider || 'local'
  }
})

const isPasswordValid = computed(() => {
  const {currentPassword, newPassword, confirmPassword} = passwordForm.value
  if (currentPassword || newPassword || confirmPassword) {
    return (
        !!currentPassword &&
        newPassword.length >= 8 &&
        newPassword === confirmPassword
    )
  }
  return false
})

const isProfileValid = computed(() => {
  const newName = profileForm.value.name?.trim()
  const currentName = user.value?.name || ''

  return !!newName && newName !== currentName
})

const emailClientSchema = z.email()

const isEmailValid = computed(() => {
  const newEmail = emailForm.value.email?.trim()
  const currentEmail = user.value?.email || ''

  if (!newEmail || newEmail === currentEmail) {
    return false
  }

  return emailClientSchema.safeParse(newEmail).success
})

const resetProfileForm = () => {
  error.value = ''
  success.value = ''
  profileForm.value.name = ''
  if (user.value) profileForm.value.name = user.value.name || ''
}

const resetPasswordForm = () => {
  error.value = ''
  success.value = ''
  passwordForm.value.currentPassword = ''
  passwordForm.value.newPassword = ''
  passwordForm.value.confirmPassword = ''
}

const resetEmailForm = () => {
  error.value = ''
  success.value = ''
  emailForm.value.email = user.value?.email || ''
}

async function updateProfile() {
  error.value = ''
  success.value = ''
  isLoading.value = true

  try {
    await $fetch('/api/user/profile', {
      method: 'PATCH',
      body: {name: profileForm.value.name}
    })

    await refreshSession()

    success.value = 'Profil mis à jour avec succès !'
  } catch (err) {
    error.value = getErrorMessage(err, 'Erreur lors de la mise à jour.')
  } finally {
    isLoading.value = false
  }
}

async function updateEmail() {
  error.value = ''
  success.value = ''
  isLoading.value = true

  try {
    await $fetch('/api/user/email', {
      method: 'PATCH',
      body: {email: emailForm.value.email}
    })

    await refreshSession()

    success.value = 'Email mis a jour avec succes !'
  } catch (err) {
    error.value = getErrorMessage(err, "Erreur lors de la mise a jour de l'email.")
  } finally {
    isLoading.value = false
  }
}

async function updatePassword() {
  if (passwordForm.value.currentPassword) {
    await $fetch('/api/user/password', {
      method: 'PATCH',
      body: {
        currentPassword: passwordForm.value.currentPassword,
        newPassword: passwordForm.value.newPassword,
        confirmPassword: passwordForm.value.confirmPassword
      },
    })
    success.value = 'Mot de passe mis à jour avec succès !'
    passwordForm.value.currentPassword = ''
    passwordForm.value.newPassword = ''
    passwordForm.value.confirmPassword = ''
  }
}

async function logout() {
  isLoading.value = true
  try {
    await clear()
    await navigateTo('/login')
  } finally {
    isLoading.value = false
  }
}

async function confirmDeleteAccount() {
  isLoading.value = true
  error.value = ''

  try {
    await $fetch('/api/user/account', {
      method: 'DELETE',
      body: authProvider.value === 'local'
          ? {password: passwordForDeletion.value}
          : {}
    })

    isDeleteDialogOpen.value = false
    await clear()
    await navigateTo('/login')
  } catch (err) {
    alert(getErrorMessage(err, 'Erreur lors de la suppression'))
    passwordForDeletion.value = ''
  } finally {
    isLoading.value = false
  }
}
</script>
