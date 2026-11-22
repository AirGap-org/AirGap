const AUTH_PREFIXES = ['/api/auth', '/api/_auth', '/auth']
const STATIC_PREFIXES = ['/_nuxt', '/_ipx', '/icons', '/_payload']
const STATIC_FILES = new Set([
    '/sw.js',
    '/manifest.webmanifest',
    '/favicon.ico',
    '/robots.txt'
])

export default defineEventHandler(async (event) => {
    const pathname = event.path.split('?')[0] ?? event.path

    if (STATIC_FILES.has(pathname) || STATIC_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
        return
    }

    if (AUTH_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
        return
    }

    const session = await getUserSession(event)

    if (session?.user) {
        event.context.user = session.user
    }

    if (session.secure?.twoFactorPending) {
        // Les assets et les pages d'auth sont déjà exclus : on protège les pages
        // applicatives et on renvoie une vraie erreur JSON aux appels API.
        if (pathname.startsWith('/api')) {
            throw createError({
                statusCode: 403,
                message: 'Vérification 2FA requise'
            })
        }

        return sendRedirect(event, '/auth/2fa', 302)
    }
})
