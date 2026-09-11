import {z} from 'zod'
import {createTransaction} from "#server/services/transactions.service";
import {assertAccountOwnership} from "#server/utils/ownership";
import {assertCategoryOwnership} from "#server/utils/categories";

const createTransactionSchema = z.object({
    amount: z.number({message: "Le montant est requis"}).positive("Le montant doit être positif"),
    description: z.string({message: "La description est requise"}).min(1, "La description ne peut pas être vide"),
    date: z.coerce.date({message: "La date est requise"}),
    accountId: z.string({message: "Le compte est requis"}).uuid().nullable(),
    typeTransaction: z.enum(["depense", "revenu", "non_categorise"], {message: "Le type est requis"}),
    categoryId: z.string().uuid(),
    recurrence: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']).optional(),
    startRecurrence: z.coerce.date().optional(),
    endRecurrence: z.coerce.date().nullable().optional(),
});

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const body = await readValidatedBody(event, (b) => createTransactionSchema.safeParse(b))

    if (!body.success) {
        throw createError({
            statusCode: 400,
            message: body.error.issues[0]?.message
        })
    }

    const data = body.data;
    const recurrence = data.recurrence ?? 'none';
    if (recurrence !== 'none') {
        if (!data.startRecurrence) {
            throw createError({statusCode: 400, message: "startRecurrence est requis pour une récurrence."});
        }
        if (data.endRecurrence && data.startRecurrence > data.endRecurrence) {
            throw createError({
                statusCode: 400,
                message: "startRecurrence doit être antérieur ou égal à endRecurrence."
            });
        }
    }

    const {categoryId, ...restBody} = body.data

    // Vérifier que le compte (si fourni) appartient bien à l'utilisateur
    await assertAccountOwnership(restBody.accountId, user.id)
    await assertCategoryOwnership(categoryId, user.id)

    const transactionPayload = {
        ...restBody,
        userId: user.id,
        amount: String(body.data.amount),

        devise: "EUR",
        recurrence: recurrence, // 'none' | 'daily' | ...
        startRecurrence: data.startRecurrence ?? data.date,
        endRecurrence: data.endRecurrence ?? null,

        createdAt: new Date(),
        updatedAt: new Date(),
    };

    try {
        const newTransaction = await createTransaction(transactionPayload, categoryId)
        return {
            success: true,
            transaction: newTransaction
        }
    } catch (error) {
        console.error('Erreur création transaction:', error)
        throw createError({
            statusCode: 500,
            message: "Impossible de créer la transaction."
        })
    }
})
