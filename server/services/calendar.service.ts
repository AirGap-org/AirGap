import {and, desc, eq, gte, lt, sql} from 'drizzle-orm'
import {assoTransactionsCategories, categories, transactions} from "~~/drizzle/schema";
import {db} from "#server/db";

export const getUserTransactionsByYear = async (userId: string, year: number, month?: number, quarter?: number) => {
    let startDate = new Date(year, 0, 1);
    let endDate = new Date(year + 1, 0, 1);

    if (month) {
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 1);
    } else if (quarter) {
        const startMonth = (quarter - 1) * 3;
        startDate = new Date(year, startMonth, 1);
        endDate = new Date(year, startMonth + 3, 1);
    }

    const [balanceRow] = await db.select({
        balance: sql<string>`COALESCE(SUM(
            CASE WHEN ${transactions.typeTransaction} = 'revenu'
                THEN ${transactions.amount}::numeric
                ELSE -${transactions.amount}::numeric
            END
        ), 0)`
    })
        .from(transactions)
        .where(and(
            eq(transactions.userId, userId),
            lt(transactions.date, startDate)
        ));

    const initialBalance = Number(balanceRow?.balance ?? 0);

    const rows = await db.select({
        id: transactions.id,
        amount: transactions.amount,
        date: transactions.date,
        description: transactions.description,
        typeEnum: transactions.typeTransaction,
        categoryName: categories.name,
        categoryId: categories.id,
    })
        .from(transactions)
        .leftJoin(assoTransactionsCategories, eq(transactions.id, assoTransactionsCategories.transactionId))
        .leftJoin(categories, eq(categories.id, assoTransactionsCategories.categoryId))
        .where(and(
            eq(transactions.userId, userId),
            gte(transactions.date, startDate),
            lt(transactions.date, endDate)
        ))
        .orderBy(transactions.date)

    return {
        initialBalance: initialBalance,
        transactions: rows.map(row => ({
            id: row.id,
            amount: row.amount,
            date: row.date,
            description: row.description,
            typeStr: row.typeEnum === 'revenu' ? 'income' : 'expense',
            category: row.categoryId ? {id: row.categoryId, name: row.categoryName} : null,
        }))
    };
}

export const getAvailableYears = async (userId: string) => {
    const yearSql = sql<number>`EXTRACT(YEAR FROM
    ${transactions.date}
    ::
    timestamp
    )`

    const rows = await db.select({
        year: yearSql
    })
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .groupBy(yearSql)
        .orderBy(desc(yearSql))

    return rows.map(row => row.year)
}

export const getAvailableMonths = async (userId: string) => {
    const monthSql = sql<number>`EXTRACT(MONTH FROM
    ${transactions.date}
    ::
    timestamp
    )`

    const rows = await db.select({
        month: monthSql
    })
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .groupBy(monthSql)
        .orderBy(desc(monthSql))

    return rows.map(row => row.month)
}

export const getAvailableQuarters = async (userId: string) => {
    const quarterSql = sql<number>`EXTRACT(QUARTER FROM
    ${transactions.date}
    ::
    timestamp
    )`

    const rows = await db.select({
        quarter: quarterSql
    })
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .groupBy(quarterSql)
        .orderBy(desc(quarterSql))

    return rows.map(row => row.quarter)
}

