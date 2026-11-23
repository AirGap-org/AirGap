import {z} from 'zod'
import {createBudget} from "#server/services/budgets.service";
import {assertAccountAvailable} from "#server/utils/ownership";
import {assertCategoriesOwnership} from "#server/utils/categories";

const createBudgetSchema = z.object({
    name: z.string({message: "Le nom est requis"})
        .trim()
        .min(1, "Le nom ne peut pas être vide")
        .max(255, "Le nom ne peut pas dépasser 255 caractères"),
    amount: z.number({message: "Le montant est requis"})
        .positive("Le montant doit être positif")
        .max(1_000_000_000_000, "Le montant est trop élevé"),
    startDate: z.coerce.date({message: "La date de début est requise"}),
    endDate: z.coerce.date({message: "La date de fin est requise"}),
    accountId: z.string().uuid({message: "Le compte est requis"}),
    categoryIds: z.array(z.string().uuid()).max(100, "Trop de catégories").optional()
}).refine((data) => data.endDate >= data.startDate, {
    message: "La date de fin doit être postérieure à la date de début",
    path: ["endDate"]
})

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const body = await readValidatedBody(event, (b) => createBudgetSchema.safeParse(b))

    if (!body.success) {
        throw createError({statusCode: 400, message: body.error.issues[0]?.message})
    }

    const {categoryIds, ...restBody} = body.data

    // Un budget est toujours rattaché à un compte actif de l'utilisateur.
    await assertAccountAvailable(restBody.accountId, user.id)
    await assertCategoriesOwnership(categoryIds, user.id)

    const budgetData = {
        ...restBody,
        userId: user.id,
        amount: String(restBody.amount),

        recurrence: "Aucune",
        startRecurrence: restBody.startDate,

        createdAt: new Date(),
        updatedAt: new Date(),
    }

    try {
        const newBudget = await createBudget(budgetData, categoryIds)

        return {
            success: true,
            budget: newBudget
        }
    } catch (error) {
        console.error('Erreur création budget:', error)
        throw createError({
            statusCode: 500,
            message: "Impossible de créer le budget"
        })
    }
})
