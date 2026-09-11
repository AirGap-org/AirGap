import {z} from 'zod'
import {updateTransaction} from "#server/services/transactions.service";
import {assertAccountOwnership} from "#server/utils/ownership";
import {assertCategoryOwnership} from "#server/utils/categories";

const paramsSchema = z.object({
    id: z.string().uuid({message: "ID de transaction invalide"})
})

const updateTransactionSchema = z.object({
    amount: z.number().optional(),
    description: z.string().min(1).optional(),
    date: z.coerce.date().optional(),
    typeTransaction: z.enum(["depense", "revenu", "non_categorise"]).optional(),
    categoryId: z.string().uuid().nullable().optional(),
    accountId: z.string().uuid().nullable().optional(),
    recurrence: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']).optional(),
    startRecurrence: z.coerce.date().nullable().optional(),
    endRecurrence: z.coerce.date().nullable().optional(),
});

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)

    const params = await getValidatedRouterParams(event, (p) => paramsSchema.safeParse(p))
    if (!params.success) {
        throw createError({statusCode: 400, message: params.error.issues[0]?.message})
    }

    const body = await readValidatedBody(event, (b) => updateTransactionSchema.safeParse(b))
    if (!body.success) {
        throw createError({statusCode: 400, message: body.error.issues[0]?.message})
    }

    const data = body.data;
    const recurrence = data.recurrence ?? undefined;
    if (recurrence && recurrence !== 'none') {
        if (!data.startRecurrence) {
            throw createError({
                statusCode: 400, message: "startRecurrence est requis pour une récurrence."
            });
        }
        if (data.endRecurrence && data.startRecurrence > data.endRecurrence) {
            throw createError({
                statusCode: 400,
                message: "startRecurrence doit être antérieur ou égal à endRecurrence."
            });
        }
    }

    if (Object.keys(body.data).length === 0) {
        return {success: true, message: "Aucune modification demandée"}
    }

    const {categoryId, ...transactionFields} = body.data

    // Vérifier que le compte (si modifié) appartient bien à l'utilisateur
    await assertAccountOwnership(transactionFields.accountId, user.id)
    await assertCategoryOwnership(categoryId, user.id)

    const dataToUpdate = {
        ...transactionFields,
        amount: transactionFields.amount === undefined ? undefined : String(transactionFields.amount),
        recurrence: data.recurrence === undefined ? undefined : data.recurrence,
        startRecurrence: data.startRecurrence === undefined ? undefined : data.startRecurrence,
        endRecurrence: data.endRecurrence === undefined ? undefined : data.endRecurrence,
        updatedAt: new Date()
    };

    try {
        const updatedTransaction = await updateTransaction(
            params.data.id,
            user.id,
            dataToUpdate,
            categoryId
        )

        if (!updatedTransaction) {
            throw createError({
                statusCode: 404,
                message: 'Transaction introuvable'
            })
        }
        return {
            success: true,
            transaction: updatedTransaction
        }
    } catch (error) {
        console.error("Erreur PATCH transaction:", error)
        throw createError({
            statusCode: 500,
            message: "Erreur lors de la mise à jour de la transaction"
        })
    }
})
