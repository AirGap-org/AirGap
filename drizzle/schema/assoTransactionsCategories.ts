import {uuid, pgTable, primaryKey, index} from "drizzle-orm/pg-core";
import {relations} from "drizzle-orm";
import {categories} from "./categories";
import {transactions} from "./transactions";

// Table assoTransactionsCategories
export const assoTransactionsCategories = pgTable('assoTransactionsCategories', {
    transactionId: uuid('transactionId').notNull().references(() => transactions.id),
    categoryId: uuid('categoryId').notNull().references(() => categories.id),
}, (table) => {
    return [
        primaryKey({columns: [table.transactionId, table.categoryId]}),
        index('asso_transactions_category_idx').on(table.categoryId),
    ];
});

export const assoTransactionsCategoriesRelations = relations(assoTransactionsCategories, ({one}) => ({
    categories: one(categories, {fields: [assoTransactionsCategories.categoryId], references: [categories.id]}),
    transactions: one(transactions, {fields: [assoTransactionsCategories.transactionId], references: [transactions.id]}),
}));
