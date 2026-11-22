import { z } from 'zod'
import { updateUserProfile } from "#server/services/user.service";
import { requireAuth } from "#server/utils/auth";

const profileSchema = z.object({
    name: z.string().trim().min(1, "Le nom ne peut pas être vide").max(255)
})

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)

    const result = await readValidatedBody(event, body => profileSchema.safeParse(body))
    if (!result.success) {
        throw createError({
            statusCode: 400,
            message: result.error.issues[0]?.message
        })
    }

    const newName = result.data.name

    try {
        await updateUserProfile(user.id, newName)
        await setUserSession(event, {
            user: {
                id: user.id,
                email: user.email,
                name: newName,
                authProvider: user.authProvider,
                twoFactorEnabled: user.twoFactorEnabled,
                sessionVersion: user.sessionVersion
            },
            secure: { twoFactorPending: false },
            loggedInAt: new Date()
        });

        return {
            success: true,
            message: "Profil mis à jour avec succès"
        }
    } catch (error) {
        console.error(error)
        throw createError({ statusCode: 500, message: 'Erreur serveur' })
    }
})