import { pgTable, uuid, varchar, timestamp, text, boolean, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { accounts } from "./accounts";
import { budgets } from "./budgets";
import { transactions } from "./transactions";
import { categories } from "./categories";

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    email: varchar('email', {length: 255}).notNull().unique(),
    name: varchar('name', {length: 255}),
    password: varchar('password', {length: 255}),
    authProvider: varchar('authProvider', {length: 255}).default('local'),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    deletedAt: timestamp('deletedAt'),
    twoFactorEnabled: boolean('two_factor_enabled').default(false).notNull(),
    twoFactorSecret: text('two_factor_secret'),
    sessionVersion: integer('session_version').notNull().default(0),
}, (table) => {
    return [
        uniqueIndex('users_email_lower_idx').on(sql`lower(${table.email})`),
        index('users_deleted_at_idx').on(table.deletedAt),
    ];
});

export const userRelations = relations(users, ({many}) => ({
    accounts: many(accounts),
    budgets: many(budgets),
    transactions: many(transactions),
    categories: many(categories),
}));
