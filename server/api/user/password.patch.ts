import { z } from 'zod'
import { getUserByEmail, updateUserPassword } from '#server/services/user.service'
import { requireAuth, updateUserSession } from '#server/utils/auth'
import { hashUserPassword, verifyUserPassword } from '#server/utils/hashing'
import { enforceRateLimit, resetRateLimit } from '#server/utils/rateLimit'

const passwordChangeSchema = z.object({
    currentPassword: z.string().min(1, 'Le mot de passe actuel est requis').max(1024),
    newPassword: z.string().min(8, 'Le nouveau mot de passe doit faire au moins 8 caractères').max(72, 'Le mot de passe ne peut pas dépasser 72 caractères'),
    confirmPassword: z.string().max(72)
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Les nouveaux mots de passe ne correspondent pas',
    path: ['confirmPassword']
})

export default defineEventHandler(async (event) => {
    const sessionUser = await requireAuth(event)

    await enforceRateLimit('password-change', sessionUser.id, 5)

    const result = await readValidatedBody(event, body => passwordChangeSchema.safeParse(body))
    if (!result.success) {
        throw createError({ statusCode: 400, message: result.error.issues[0]?.message })
    }

    const { currentPassword, newPassword } = result.data

    const userInDb = await getUserByEmail(sessionUser.email)
    if (!userInDb) {
        throw createError({ statusCode: 404, message: 'Utilisateur introuvable' })
    }

    if (!userInDb.password) {
        throw createError({ statusCode: 400, message: 'Aucun mot de passe configuré pour ce compte' })
    }

    if (!await verifyUserPassword(userInDb.password, currentPassword)) {
        throw createError({ statusCode: 403, message: 'Mot de passe actuel incorrect' })
    }

    const newHashedPassword = await hashUserPassword(newPassword)
    const [updated] = await updateUserPassword(sessionUser.id, newHashedPassword)

    if (updated) {
        await updateUserSession(event, { sessionVersion: updated.sessionVersion })
    }

    await resetRateLimit('password-change', sessionUser.id)

    return { success: true, message: 'Mot de passe modifié avec succès' }
})
