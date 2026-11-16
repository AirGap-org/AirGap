import {z} from 'zod'
import {getUserByEmail, updateUserEmail} from '#server/services/user.service'
import {requireAuth} from '#server/utils/auth'
import {verifyUserPassword} from '#server/utils/hashing'

const emailSchema = z.object({
    email: z.email('Email invalide'),
    currentPassword: z.string().min(1, 'Le mot de passe actuel est requis')
})

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)

    const result = await readValidatedBody(event, (body) => emailSchema.safeParse(body))
    if (!result.success) {
        throw createError({
            statusCode: 400,
            message: result.error.issues[0]?.message
        })
    }

    const newEmail = result.data.email

    // Re-vérification du mot de passe pour cette action sensible
    const userInDb = await getUserByEmail(user.email)
    if (!userInDb || !userInDb.password) {
        throw createError({statusCode: 400, message: 'Aucun mot de passe configuré pour ce compte'})
    }
    if (!await verifyUserPassword(userInDb.password, result.data.currentPassword)) {
        throw createError({statusCode: 403, message: 'Mot de passe actuel incorrect'})
    }

    const existingUser = await getUserByEmail(newEmail)
    if (newEmail === user.email || (existingUser && existingUser.id !== user.id)) {
        throw createError({statusCode: 400, message: 'Impossible de faire la modification ! Contactez le support.'})
    }

    try {
        await updateUserEmail(user.id, newEmail)

        await setUserSession(event, {
            user: {
                id: user.id,
                email: newEmail,
                name: user.name,
                authProvider: user.authProvider,
                twoFactorEnabled: user.twoFactorEnabled
            },
            secure: { twoFactorPending: false },
            loggedInAt: new Date()
        })


        return {
            success: true,
            message: 'Email mis a jour avec succes'
        }
    } catch (error) {
        console.error(error)
        throw createError({statusCode: 500, message: 'Erreur serveur'})
    }
})

