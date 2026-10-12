import { and, eq, sql } from 'drizzle-orm';
import { db } from '#server/db';
import { portfolio } from "~~/drizzle/schema";
import type { Position } from '#shared/types/market';

export const listPositions = async (userId: string): Promise<Position[]> => {
    const rows = await db
        .select({ symbol: portfolio.symbol, quantity: portfolio.quantity, pru: portfolio.pru })
        .from(portfolio)
        .where(eq(portfolio.userId, userId))
        .orderBy(portfolio.symbol);

    return rows.map((r) => ({ symbol: r.symbol, quantity: Number(r.quantity), pru: Number(r.pru) }));
};

export const addPosition = async (userId: string, { symbol, quantity, pru }: Position) => {
    await db.insert(portfolio)
        .values({ userId, symbol, quantity: String(quantity), pru: String(pru) })
        .onConflictDoUpdate({
            target: [portfolio.userId, portfolio.symbol],
            set: {
                pru: sql`(${portfolio.quantity} * ${portfolio.pru} + ${quantity}::numeric * ${pru}::numeric) / (${portfolio.quantity} + ${quantity}::numeric)`,
                quantity: sql`${portfolio.quantity} + ${quantity}::numeric`,
                updatedAt: new Date(),
            },
        });
};

export const removePosition = async (userId: string, symbol: string) => {
    const deleted = await db
        .delete(portfolio)
        .where(and(eq(portfolio.userId, userId), eq(portfolio.symbol, symbol)))
        .returning({ id: portfolio.id });

    return deleted.length > 0;
};