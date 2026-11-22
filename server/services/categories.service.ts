import {and, eq, isNull, or} from 'drizzle-orm';
import {categories} from "~~/drizzle/schema";
import type {TransactionType} from "~~/drizzle/schema";
import {db} from "#server/db";

export const getAllCategories = async (userId: string, typeEnum?: TransactionType) => {
    const conditions = [
        or(eq(categories.userId, userId), isNull(categories.userId))
    ];

    if (typeEnum) {
        conditions.push(eq(categories.typeTransaction, typeEnum));
    }

    return await db.select()
        .from(categories)
        .where(and(...conditions))
        .orderBy(categories.name);
};

export const getCategoryById = async (categoryId: string, userId?: string) => {
    const conditions = userId
        ? and(eq(categories.id, categoryId), or(eq(categories.userId, userId), isNull(categories.userId)))
        : eq(categories.id, categoryId);

    const result = await db.select()
        .from(categories)
        .where(conditions)
        .limit(1);
    return result[0];
}

export const createCategory = async (data: {
    name: string;
    typeTransaction: "depense" | "revenu" | "non_categorise";
    userId: string
}) => {
    const [newCategory] = await db.insert(categories).values({
        name: data.name,
        typeTransaction: data.typeTransaction,
        userId: data.userId,
    }).returning();
    return newCategory;
};

export const updateCategory = async (
    categoryId: string,
    userId: string,
    updateData: Partial<typeof categories.$inferInsert>
) => {
    const categoryTarget = await getCategoryById(categoryId, userId);

    if (!categoryTarget) {
        throw createError({ statusCode: 404, message: 'Catégorie introuvable' });
    }

    // Les catégories globales (userId NULL) sont immuables hors d'un back-office admin dédié.
    if (categoryTarget.userId === null) {
        throw createError({
            statusCode: 403,
            message: 'Impossible de modifier une catégorie par défaut'
        });
    }

    if (categoryTarget.isDefault === true) {
        throw createError({
            statusCode: 403,
            message: 'Impossible de modifier une catégorie par défaut'
        });
    }

    const [updatedCategory] = await db.update(categories)
        .set(updateData)
        .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
        .returning();
    return updatedCategory;
}

export const deleteCategory = async (categoryId: string, userId: string) => {
    const categoryTarget = await getCategoryById(categoryId, userId);

    if (!categoryTarget) {
        throw createError({ statusCode: 404, message: 'Catégorie introuvable' });
    }

    if (categoryTarget.userId === null) {
        throw createError({
            statusCode: 403,
            message: 'Impossible de supprimer une catégorie par défaut'
        });
    }

    if (categoryTarget.isDefault === true) {
        throw createError({
            statusCode: 403,
            message: 'Impossible de supprimer une catégorie par défaut'
        });
    }

    const [deletedCategory] = await db.delete(categories)
        .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
        .returning();
    return deletedCategory;
}