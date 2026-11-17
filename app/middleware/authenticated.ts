export default defineNuxtRouteMiddleware(async () => {
    const { loggedIn, session, fetch: refreshSession } = useUserSession()

    if (!loggedIn.value) await refreshSession()

    if (!loggedIn.value) {
        return navigateTo('/login')
    }

    if (session.value?.secure?.twoFactorPending) {
        return navigateTo('/auth/2fa')
    }
})
