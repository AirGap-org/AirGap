import {pgTable, uuid, varchar, decimal, timestamp, index} from "drizzle-orm/pg-core";
import {users} from "./users";
import {relations} from "drizzle-orm";
import {accounts} from "./accounts";
import {assoBudgetCategories} from "./assoBudgetCategories";

// Table Budget
export const budgets = pgTable('budgets', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    userId: uuid('userId').references(() => users.id).notNull(),
    accountId: uuid('accountId').references(() => accounts.id),
    name: varchar('name', {length: 255}).notNull(),
    amount: decimal('amount', {precision: 15, scale: 3}).notNull(),
    recurrence: varchar("recurrence", { length: 30 }).notNull(),
    startRecurrence: timestamp('startRecurrence').notNull(),
    endRecurrence: timestamp('endRecurrence'),
    startDate: timestamp('startDate').notNull(),
    endDate: timestamp('endDate').notNull(),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => {
    return [
        index('budgets_user_idx').on(table.userId),
        index('budgets_account_idx').on(table.accountId),
    ];
});

export const budgetRelations = relations(budgets, ({ one, many }) => ({
    user: one(users, {
        fields: [budgets.userId],
        references: [users.id]
    }),
    account: one(accounts, {
        fields: [budgets.accountId],
        references: [accounts.id]
    }),
    categories: many(assoBudgetCategories),
}));