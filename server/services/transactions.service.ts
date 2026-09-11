import {and, desc, eq} from 'drizzle-orm'
import {assoTransactionsCategories, categories, transactions} from "~~/drizzle/schema";
import {db} from "#server/db";

/**
 * Types et utilitaires
 */
type TransactionInsert = typeof transactions.$inferInsert;
type AssociationInsert = typeof assoTransactionsCategories.$inferInsert;

const getTransactionSignature = (date: Date, amount: number, description: string) => {
    const dateStr = new Date(date).toISOString().split('T')[0];
    return `${dateStr}_${amount}_${description.trim()}`;
};

const resolveCategory = async (
    tx: any,
    t: any,
    typeValue: "depense" | "revenu" | "non_categorise",
    categoryMap: Map<string, string>
): Promise<string | null> => {
    if (t.selectedCategoryId && categoryMap.has(String(t.selectedCategoryId))) {
        return String(t.selectedCategoryId);
    }

    if (t.categoryName?.trim()) {
        const key = t.categoryName.toLowerCase().trim();
        if (categoryMap.has(key)) return categoryMap.get(key)!;

        const [newCat] = await tx.insert(categories).values({
            name: t.categoryName.trim(),
            typeTransaction: typeValue,
            userId: t.userId ?? null,
            isDefault: false
        }).returning({id: categories.id});

        categoryMap.set(key, newCat.id);
        return newCat.id;
    }

    return t.selectedCategoryId ?? null;
};

/**
 * Fonctions de Service Exportées
 */

export const getTransactionById = async (transactionId: string, userId: string) => {
    const rows = await db.select({
        id: transactions.id,
        amount: transactions.amount,
        description: transactions.description,
        date: transactions.date,
        typeTransaction: transactions.typeTransaction,
        accountId: transactions.accountId,
        devise: transactions.devise,
        categoryName: categories.name,
        categoryId: categories.id
    })
        .from(transactions)
        .leftJoin(assoTransactionsCategories, eq(transactions.id, assoTransactionsCategories.transactionId))
        .leftJoin(categories, eq(assoTransactionsCategories.categoryId, categories.id))
        .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
        .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
        ...row,
        description: decryptText(row.description || ''),
        category: row.categoryName ? {id: row.categoryId, name: row.categoryName} : null
    };
}

export const deleteTransaction = async (transactionId: string, userId: string) => {
    return await db.transaction(async (tx) => {
        await tx.delete(assoTransactionsCategories).where(eq(assoTransactionsCategories.transactionId, transactionId));
        const [deleted] = await tx.delete(transactions)
            .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)))
            .returning();
        return deleted;
    });
}

export const updateTransaction = async (
    transactionId: string,
    userId: string,
    updateData: Partial<TransactionInsert>,
    newCategoryId?: string | null
) => {
    const finalUpdateData = {...updateData};

    if (finalUpdateData.description) {
        finalUpdateData.description = encryptText(finalUpdateData.description);
    }

    return await db.transaction(async (tx) => {
        const [updated] = await tx.update(transactions)
            .set({...finalUpdateData, updatedAt: new Date()})
            .where(and(
                eq(transactions.id, transactionId),
                eq(transactions.userId, userId)
            ))
            .returning();

        if (newCategoryId !== undefined) {
            await tx.delete(assoTransactionsCategories)
                .where(eq(assoTransactionsCategories.transactionId, transactionId));

            if (newCategoryId) {
                await tx.insert(assoTransactionsCategories)
                    .values({
                        transactionId,
                        categoryId: newCategoryId
                    });
            }
        }
        return updated;
    });
}

export const getUserTransactions = async (userId: string) => {
    const rows = await db.select({
        id: transactions.id,
        amount: transactions.amount,
        description: transactions.description,
        date: transactions.date,
        typeTransaction: transactions.typeTransaction,
        categoryName: categories.name,
        categoryId: categories.id,
        recurrence: transactions.recurrence,
        startRecurrence: transactions.startRecurrence,
        endRecurrence: transactions.endRecurrence
    })
        .from(transactions)
        .leftJoin(assoTransactionsCategories, eq(transactions.id, assoTransactionsCategories.transactionId))
        .leftJoin(categories, eq(assoTransactionsCategories.categoryId, categories.id))
        .where(eq(transactions.userId, userId))
        .orderBy(desc(transactions.date));

    return rows.map(row => ({
        ...row,
        description: decryptText(row.description || ''),
        category: row.categoryName ? {id: row.categoryId, name: row.categoryName} : null
    }));
}

export const createTransaction = async (data: TransactionInsert, categoryId?: string | null) => {
    const encryptedData = {
        ...data,
        description: data.description ? encryptText(data.description) : ''
    };
    return await db.transaction(async (tx) => {
        const [newTx] = await tx.insert(transactions).values(encryptedData).returning();
        if (categoryId) {
            await tx.insert(assoTransactionsCategories).values({
                transactionId: newTx!.id,
                categoryId
            });
        }
        return newTx;
    });
}

export const importTransactionsBulk = async (userId: string, rawTransactions: Record<string, any>[]) => {
    return await db.transaction(async (tx) => {
        const now = new Date();

        const categoryMap = new Map<string, string>((await tx.select({
            id: categories.id,
            name: categories.name
        }).from(categories).where(eq(categories.userId, userId)))
            .map(c => [c.name.toLowerCase().trim(), c.id]));

        const existing = await tx.select().from(transactions).where(eq(transactions.userId, userId));
        const signatures = new Set(existing.map(t =>
            getTransactionSignature(new Date(t.date), Number(t.amount), decryptText(t.description || '').toLowerCase().trim())
        ));

        let importedCount = 0;
        let skippedCount = 0;

        const transactionsToInsert: TransactionInsert[] = [];
        const associatedCategories: (string | null)[] = [];

        for (const t of rawTransactions) {
            const amount = Math.abs(Number(t.amount));
            const dateObj = new Date(t.date);
            const cleanDesc = t.description?.trim() || 'Import CSV';

            if (signatures.has(getTransactionSignature(dateObj, amount, cleanDesc.toLowerCase()))) {
                skippedCount++;
                continue;
            }

            const typeValue = t.typeTransaction || (Number(t.amount) >= 0 ? 'revenu' : 'depense');
            const matchedId = await resolveCategory(tx, t, typeValue, categoryMap);

            transactionsToInsert.push({
                userId,
                accountId: null,
                description: encryptText(cleanDesc),
                amount: String(amount),
                date: dateObj,
                typeTransaction: typeValue as "depense" | "revenu" | "non_categorise",
                devise: 'EUR',
                recurrence: 'Aucune',
                startRecurrence: dateObj,
                updatedAt: now
            });
            associatedCategories.push(matchedId || categoryMap.get('non catégorisé') || null);
            importedCount++;
        }

        const BATCH_SIZE = 100;
        for (let i = 0; i < transactionsToInsert.length; i += BATCH_SIZE) {
            const txBatch = transactionsToInsert.slice(i, i + BATCH_SIZE);
            const catBatch = associatedCategories.slice(i, i + BATCH_SIZE);
            if (txBatch.length > 0) {
                const insertedRows = await tx.insert(transactions)
                    .values(txBatch)
                    .returning({id: transactions.id});

                const associationRows: AssociationInsert[] = [];
                insertedRows.forEach((row, index) => {
                    const catId = catBatch[index];
                    if (catId) {
                        associationRows.push({
                            transactionId: row.id,
                            categoryId: catId
                        });
                    }
                });
                if (associationRows.length > 0) {
                    await tx.insert(assoTransactionsCategories).values(associationRows);
                }
            }
        }
        return importedCount;
    });
};
