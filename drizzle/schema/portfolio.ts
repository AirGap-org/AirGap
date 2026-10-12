import { pgTable, uuid, varchar, numeric, timestamp, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';

export const portfolio = pgTable('portfolio', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    quantity: numeric('quantity', { precision: 14, scale: 4 }).notNull(),
    pru: numeric('pru', { precision: 14, scale: 4 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
    uniqueIndex('portfolio_user_symbol_uidx').on(t.userId, t.symbol),
    check('portfolio_quantity_positive', sql`${t.quantity} > 0`),
    check('portfolio_pru_non_negative', sql`${t.pru} >= 0`),
    check('portfolio_symbol_uppercase', sql`${t.symbol} = upper(${t.symbol})`),
]);

export const portfolioRelations = relations(portfolio, ({ one }) => ({
    user: one(users, {
        fields: [portfolio.userId],
        references: [users.id],
    }),
}));