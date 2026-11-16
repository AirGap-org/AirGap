import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { db } from '#server/db'
import { users } from '~~/drizzle/schema'
import { isUserActive } from '#server/utils/userStatus'

declare module '#auth-utils' {
    interface User {
        id: string
        email: string
        name?: string | null
        authProvider: string
        twoFactorEnabled: boolean
    }

    interface SecureSessionData {
        twoFactorPending: boolean
    }
}

export const requireAuth = async (event: H3Event) => {
    const session = await getUserSession(event)

    if (!session?.user) {
        throw createError({
            statusCode: 401,
            message: 'Vous devez être connecté pour effectuer cette action'
        })
    }

    if (session.secure?.twoFactorPending) {
        throw createError({
            statusCode: 403,
            message: 'La vérification 2FA est requise'
        })
    }

    const dbUser = await db.query.users.findFirst({
        where: eq(users.id, session.user.id)
    })

    if (!isUserActive(dbUser)) {
        await clearUserSession(event)
        throw createError({
            statusCode: 401,
            message: 'Session invalide ou compte supprimé'
        })
    }

    if (session.user.twoFactorEnabled !== dbUser.twoFactorEnabled) {
        const syncedUser = {
            ...session.user,
            twoFactorEnabled: dbUser.twoFactorEnabled
        }

        await setUserSession(event, {
            ...session,
            user: syncedUser
        })

        return syncedUser
    }

    return session.user
}

/** Authentification limitée utilisée uniquement pendant la vérification TOTP. */
export const requirePendingTwoFactor = async (event: H3Event) => {
    const session = await getUserSession(event)

    if (!session?.user || !session.secure?.twoFactorPending) {
        throw createError({ statusCode: 403, message: 'Non autorisé' })
    }

    return { ...session, user: session.user }
}

/** Crée une session complète ou une session limitée si la 2FA est activée. */
export const establishUserSession = async (event: H3Event, user: {
    id: string
    email: string
    name?: string | null
    authProvider: string
    twoFactorEnabled: boolean
}) => {
    await setUserSession(event, {
        user,
        secure: { twoFactorPending: user.twoFactorEnabled },
        ...(user.twoFactorEnabled ? {} : { loggedInAt: new Date() })
    })
}

/** Met à jour les attributs utilisateur de la session sans recréer son contexte. */
export const updateUserSession = async (
    event: H3Event,
    updates: Partial<{
        id: string
        email: string
        name: string | null
        authProvider: string
        twoFactorEnabled: boolean
    }>
) => {
    const session = await getUserSession(event)
    if (!session?.user) return

    await setUserSession(event, {
        ...session,
        user: { ...session.user, ...updates }
    })
}
