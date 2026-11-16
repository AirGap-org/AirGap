import {z} from 'zod'
import {deleteBudget} from "#server/services/budgets.service";
import {getErrorStatusCode} from "#server/utils/errors";

// Validation de l'ID URL
const paramsSchema = z.object({
    id: z.string().uuid({message: "Identifiant de budget invalide"})
});

export default defineEventHandler(async (event) => {
    // 1. Sécurité : On attend l'utilisateur
    const user = await requireAuth(event)

    // 2. Validation ID
    const params = await getValidatedRouterParams(event, (p) => paramsSchema.safeParse(p))

    if (!params.success) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Identifiant de budget invalide'
        })
    }

    try {
        // 3. Appel du Service
        const deletedBudget = await deleteBudget(params.data.id, user.id)

        // 4. Vérification
        if (!deletedBudget) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Budget introuvable ou déjà supprimé'
            })
        }

        return {
            success: true,
            message: 'Budget supprimé avec succès',
            id: deletedBudget.id
        }
    } catch (error) {
        // Si c'est notre erreur 404, on la laisse passer
        if (getErrorStatusCode(error) === 404) throw error

        console.error('Erreur suppression budget:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Impossible de supprimer le budget'
        })
    }
})