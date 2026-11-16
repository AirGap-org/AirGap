import { z } from 'zod'
import { getUserByEmail, updateUserPassword } from '#server/services/user.service'
import { requireAuth } from '#server/utils/auth'
import { hashUserPassword, verifyUserPassword } from '#server/utils/hashing'

const passwordChangeSchema = z.object({
    currentPassword: z.string().min(1, 'Le mot de passe actuel est requis'),
    newPassword: z.string().min(8, 'Le nouveau mot de passe doit faire au moins 8 caractères'),
    confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Les nouveaux mots de passe ne correspondent pas',
    path: ['confirmPassword']
})

export default defineEventHandler(async (event) => {
    const sessionUser = await requireAuth(event)

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
    await updateUserPassword(sessionUser.id, newHashedPassword)

    return { success: true, message: 'Mot de passe modifié avec succès' }
})
