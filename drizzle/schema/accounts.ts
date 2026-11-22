import {pgTable, uuid, varchar, timestamp, decimal, index} from "drizzle-orm/pg-core";
import { users } from "./users";
import { relations } from "drizzle-orm";
import { transactions } from "./transactions";
import {budgets} from "./budgets";
import {assoAccountsCategories} from "./assoAccountsCategories";
import {senderRecipient} from "./senderRecipient";

// Table Account
export const accounts = pgTable('accounts', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    userId: uuid('userId').references(() => users.id).notNull(),
    accountName: varchar('accountName', {length: 255}).notNull(),
    accountType: varchar('accountType', {length: 255}).notNull(),
    balance: decimal('balance', {precision: 15, scale: 3}).notNull(),
    currency: varchar('currency', {length: 3}).notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => {
    return [
        index('accounts_user_idx').on(table.userId),
    ];
});

export const accountRelations = relations(accounts, ({one,many}) => ({
    user: one(users, {
        fields: [accounts.userId],
        references: [users.id],
    }),
    categories: many(assoAccountsCategories),
    transactions: many(transactions),
    budgets: many(budgets),
    senderRecipient: many(senderRecipient),
}));
