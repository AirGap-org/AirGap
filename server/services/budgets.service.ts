import {and, desc, eq} from 'drizzle-orm'
import {db} from "#server/db";
import {accounts, assoBudgetCategories, budgets, categories} from "~~/drizzle/schema";

type BudgetWithCategories = {
    id: string;
    name: string;
    amount: string;
    startDate: Date;
    endDate: Date;
    accountId: string;
    accountName: string;
    categories: { id: string; name: string }[];
};

type BudgetRow = {
    id: string;
    name: string;
    amount: string;
    startDate: Date;
    endDate: Date;
    accountId: string;
    accountName: string | null;
    categoryName: string | null;
    categoryId: string | null;
};

const mapBudgetRows = (rows: BudgetRow[]): BudgetWithCategories[] => {
    const budgetsMap = new Map<string, BudgetWithCategories>();

    for (const row of rows) {
        if (!budgetsMap.has(row.id)) {
            budgetsMap.set(row.id, {
                id: row.id,
                name: row.name,
                amount: row.amount,
                startDate: row.startDate,
                endDate: row.endDate,
                accountId: row.accountId,
                accountName: row.accountName ?? '',
                categories: []
            });
        }

        if (row.categoryId) {
            const budget = budgetsMap.get(row.id);
            if (budget && !budget.categories.some((c) => c.id === row.categoryId)) {
                budget.categories.push({
                    id: row.categoryId,
                    name: row.categoryName ?? '',
                });
            }
        }
    }

    return Array.from(budgetsMap.values());
};

export const getUserBudgets = async (userId: string) => {
    const rows = await db.select({
        id: budgets.id,
        name: budgets.name,
        amount: budgets.amount,
        startDate: budgets.startDate,
        endDate: budgets.endDate,
        accountId: budgets.accountId,
        accountName: accounts.accountName,

        categoryName: categories.name,
        categoryId: categories.id,
    })
        .from(budgets)
        .leftJoin(accounts, eq(budgets.accountId, accounts.id))
        .leftJoin(assoBudgetCategories, eq(budgets.id, assoBudgetCategories.budgetId))
        .leftJoin(categories, eq(assoBudgetCategories.categoryId, categories.id))
        .where(eq(budgets.userId, userId))
        .orderBy(desc(budgets.startDate));

    return mapBudgetRows(rows);
}

export const createBudget = async (
    data: typeof budgets.$inferInsert,
    categoryIds?: string[]
) => {
    return await db.transaction(async (tx) => {
        const [newBudget] = await tx.insert(budgets)
            .values(data)
            .returning();
        if (!newBudget) {
            throw createError("Budget cannot be created");
        }
        if (categoryIds && categoryIds.length > 0) {
            const linksToCreate = categoryIds.map(catId => ({
                budgetId: newBudget?.id,
                categoryId: catId
            }));

            await tx.insert(assoBudgetCategories).values(linksToCreate);
        }

        const linkedCategories = await tx.select({
            id: categories.id,
            name: categories.name
        })
            .from(categories)
            .innerJoin(assoBudgetCategories, eq(categories.id, assoBudgetCategories.categoryId))
            .where(eq(assoBudgetCategories.budgetId, newBudget.id));

        return {...newBudget, categories: linkedCategories};
    });
}

export const updateBudget = async (
    budgetId: string,
    userId: string,
    updateData: Partial<typeof budgets.$inferInsert>,
    newCategoryIds?: string[]
) => {
    return await db.transaction(async (tx) => {
        let updatedBudget: typeof budgets.$inferSelect | undefined;

        if (Object.keys(updateData).length > 0) {
            const result = await tx.update(budgets)
                .set(updateData)
                .where(and(eq(budgets.id, budgetId), eq(budgets.userId, userId)))
                .returning();
            updatedBudget = result[0];
        } else {
            const result = await tx.select().from(budgets)
                .where(and(eq(budgets.id, budgetId), eq(budgets.userId, userId)));
            updatedBudget = result[0];
        }

        if (!updatedBudget) return null;

        if (newCategoryIds !== undefined) {
            await tx.delete(assoBudgetCategories)
                .where(eq(assoBudgetCategories.budgetId, budgetId));

            if (newCategoryIds.length > 0) {
                await tx.insert(assoBudgetCategories).values(
                    newCategoryIds.map(catId => ({
                        budgetId: budgetId,
                        categoryId: catId
                    }))
                );
            }
        }

        const linkedCategories = await tx.select({
            id: categories.id,
            name: categories.name
        })
            .from(categories)
            .innerJoin(assoBudgetCategories, eq(categories.id, assoBudgetCategories.categoryId))
            .where(eq(assoBudgetCategories.budgetId, budgetId));

        return {
            ...updatedBudget,
            categories: linkedCategories
        };
    });
}

export const deleteBudget = async (budgetId: string, userId: string) => {
    return await db.transaction(async (tx) => {
        // Vérifier l'appartenance AVANT de toucher aux associations.
        const owned = await tx.select({ id: budgets.id })
            .from(budgets)
            .where(and(eq(budgets.id, budgetId), eq(budgets.userId, userId)))
            .limit(1);

        if (!owned[0]) return undefined;

        await tx.delete(assoBudgetCategories)
            .where(eq(assoBudgetCategories.budgetId, budgetId));

        const [deletedRow] = await tx.delete(budgets)
            .where(and(eq(budgets.id, budgetId), eq(budgets.userId, userId)))
            .returning();

        return deletedRow;
    });
}

export const getBudgetById = async (budgetId: string, userId: string) => {
    const rows = await db.select({
        id: budgets.id,
        name: budgets.name,
        amount: budgets.amount,
        startDate: budgets.startDate,
        endDate: budgets.endDate,
        accountId: budgets.accountId,
        accountName: accounts.accountName,
        categoryName: categories.name,
        categoryId: categories.id,
    })
        .from(budgets)
        .leftJoin(accounts, eq(budgets.accountId, accounts.id))
        .leftJoin(assoBudgetCategories, eq(budgets.id, assoBudgetCategories.budgetId))
        .leftJoin(categories, eq(assoBudgetCategories.categoryId, categories.id))
        .where(and(eq(budgets.id, budgetId), eq(budgets.userId, userId)));

    return mapBudgetRows(rows)[0] ?? null;
}