import {pgTable, uuid, primaryKey, index} from "drizzle-orm/pg-core";
import {accounts} from "./accounts";
import {categories} from "./categories";
import {relations} from "drizzle-orm";

// Table AssoAccountsCategories
export const assoAccountsCategories = pgTable('assoAccountsCategories', {
    accountId: uuid('accountId').notNull().references(() => accounts.id),
    categoryId: uuid('categoryId').notNull().references(() => categories.id),
}, (table) => {
    return [
        primaryKey({columns: [table.accountId, table.categoryId]}),
        index('asso_accounts_category_idx').on(table.categoryId),
    ];
});

export const assoAccountsCategoriesRelations = relations(assoAccountsCategories, ({one}) => ({
    accounts: one(accounts, {fields: [assoAccountsCategories.accountId], references: [accounts.id]}),
    categories: one(categories, {fields: [assoAccountsCategories.categoryId], references: [categories.id]}),
}));