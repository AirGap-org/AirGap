export default defineNuxtRouteMiddleware(() => {
    const { session, loggedIn } = useUserSession()

    if (!loggedIn.value) {
        return navigateTo('/login')
    }

    // Si la 2FA n'est plus en attente, la page de vérification n'a plus lieu d'être.
    if (!session.value?.secure?.twoFactorPending) {
        return navigateTo('/')
    }
})
