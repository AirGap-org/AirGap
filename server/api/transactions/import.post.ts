import {z} from 'zod';
import {importTransactionsBulk} from "#server/services/transactions.service";
import {assertCategoriesOwnership} from "#server/utils/categories";
import {assertAccountsOwnership} from "#server/utils/ownership";
import {getErrorMessage} from "#server/utils/errors";
import {enforceRateLimit} from "#server/utils/rateLimit";

const importSchema = z.object({
    transactions: z.array(z.object({
        date: z.coerce.date(),
        description: z.string().trim().min(1).max(1000),
        amount: z.number().finite().max(1_000_000_000_000),
        accountId: z.string().uuid().nullable().optional(),
        selectedCategoryId: z.string().uuid().nullable().optional(),
        categoryName: z.string().trim().max(255).nullable().optional(),
        typeTransaction: z.enum(["depense", "revenu", "non_categorise"]).optional()
    })).min(1).max(2000, "Trop de transactions dans un seul import")
});

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event);

    await enforceRateLimit('import', user.id, 10)

    const body = await readValidatedBody(event, (b) => importSchema.safeParse(b));

    if (!body.success) {
        console.error("Erreur Validation Zod:", body.error.issues);
        throw createError({
            statusCode: 400,
            message: "Données invalides : " + body.error.issues[0]?.message
        });
    }

    try {
        await assertCategoriesOwnership(
            body.data.transactions
                .map(transaction => transaction.selectedCategoryId)
                .filter((categoryId): categoryId is string => Boolean(categoryId)),
            user.id
        )

        await assertAccountsOwnership(
            body.data.transactions
                .map(transaction => transaction.accountId)
                .filter((accountId): accountId is string => Boolean(accountId)),
            user.id
        )

        const count = await importTransactionsBulk(user.id, body.data.transactions);
        return {success: true, count};
    } catch (error) {
        console.error("Erreur SQL Import:", error);
        throw createError({
            statusCode: 500,
            message: getErrorMessage(error, "Erreur serveur lors de l'importation.")
        });
    }
});
