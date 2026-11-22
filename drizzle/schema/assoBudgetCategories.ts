import {pgTable, uuid, primaryKey, index} from "drizzle-orm/pg-core";
import {relations} from "drizzle-orm";
import { categories } from "./categories";
import { budgets } from "./budgets";

// Table assoBudgetCategory

export const assoBudgetCategories = pgTable('assoBudgetCategories', {
    budgetId: uuid('budgetId').notNull().references(() => budgets.id),
    categoryId: uuid('categoryId').notNull().references(() => categories.id),
}, (table) => {
    return [
        primaryKey({columns: [table.budgetId, table.categoryId]}),
        index('asso_budget_category_idx').on(table.categoryId),
    ];
});

export const budgetCategoryRelations = relations(assoBudgetCategories, ({one}) => ({
    categories: one(categories, {fields: [assoBudgetCategories.categoryId], references: [categories.id]}),
    budgets: one(budgets, {fields: [assoBudgetCategories.budgetId], references: [budgets.id]}),
}));