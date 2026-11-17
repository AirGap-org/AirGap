import { pgTable, varchar, timestamp, uuid, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { assoBudgetCategories } from "./assoBudgetCategories";
import { assoTransactionsCategories } from "./assoTransactionsCategories";
import { assoAccountsCategories } from "./assoAccountsCategories";
import { typeTransactionEnum } from "./typeTransactions";
import { users } from "./users";

export const categories = pgTable('categories', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    name: varchar('name', {length: 255}).notNull(),
    typeTransaction: typeTransactionEnum('type_transaction').notNull(),
    userId: uuid('user_id').references(() => users.id),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
    isDefault: boolean('isDefault').default(false),
}, (table) => {
    return [
        index('categories_user_idx').on(table.userId),
        index('categories_user_name_idx').on(table.userId, table.name),
    ];
});

export const categoryRelations = relations(categories, ({many, one}) => ({
    accounts: many(assoAccountsCategories),
    budgets: many(assoBudgetCategories),
    transactions: many(assoTransactionsCategories),
    user: one(users, {
        fields: [categories.userId],
        references: [users.id],
    }),
}));