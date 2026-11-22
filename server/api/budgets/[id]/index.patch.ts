import {z} from 'zod'
import {updateBudget} from "#server/services/budgets.service";
import {assertAccountOwnership} from "#server/utils/ownership";
import {assertCategoriesOwnership} from "#server/utils/categories";
import {rethrowIfHttpError} from "#server/utils/errors";

const paramsSchema = z.object({
    id: z.string().uuid({message: "ID de budget invalide"})
})
const updateBudgetSchema = z.object({
    name: z.string().trim().min(1).max(255).optional(),
    amount: z.number().positive().max(1_000_000_000_000).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    accountId: z.string().uuid().optional().nullable(),
    categoryIds: z.array(z.string().uuid()).max(100, "Trop de catégories").optional()
}).refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
    message: "La date de fin doit être postérieure à la date de début",
    path: ["endDate"]
})

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const params = await getValidatedRouterParams(event, (p) => paramsSchema.safeParse(p))
    if (!params.success) {
        throw createError({statusCode: 400, message: 'ID de budget invalide'})
    }
    const body = await readValidatedBody(event, (b) => updateBudgetSchema.safeParse(b))

    if (!body.success) {
        throw createError({
            statusCode: 400,
            message: body.error.issues[0]?.message
        })
    }
    if (Object.keys(body.data).length === 0) {
        return {success: true, message: "Aucune modification demandée"}
    }

    const {categoryIds, ...restBody} = body.data

    // Vérifier que le compte (si modifié) appartient bien à l'utilisateur
    await assertAccountOwnership(restBody.accountId, user.id)
    await assertCategoriesOwnership(categoryIds, user.id)

    const budgetData = {
        ...restBody,
        amount: restBody.amount ? String(restBody.amount) : undefined,
        updatedAt: new Date()
    }

    try {
        const updatedBudget = await updateBudget(
            params.data.id,
            user.id,
            budgetData,
            categoryIds
        )

        if (!updatedBudget) {
            throw createError({
                statusCode: 404,
                message: 'Budget introuvable'
            })
        }

        return {
            success: true,
            budget: updatedBudget
        }
    } catch (error) {
        rethrowIfHttpError(error)
        console.error('Erreur Update Budget:', error)
        throw createError({
            statusCode: 500,
            message: "Erreur lors de la mise à jour du budget"
        })
    }
})
