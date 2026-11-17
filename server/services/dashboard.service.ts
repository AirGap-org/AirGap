import { and, desc, eq, gte, lt, sql } from 'drizzle-orm'
import { db } from '#server/db'
import { assoTransactionsCategories, categories, transactions } from '~~/drizzle/schema'

type PeriodRange = {
    start: Date
    end: Date
}

const aggregatePeriod = async (userId: string, range?: PeriodRange) => {
    const conditions = [eq(transactions.userId, userId)]

    if (range) {
        conditions.push(gte(transactions.date, range.start), lt(transactions.date, range.end))
    }

    const [row] = await db.select({
        income: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.typeTransaction} = 'revenu' THEN ${transactions.amount}::numeric ELSE 0 END), 0)`,
        expense: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.typeTransaction} = 'revenu' THEN 0 ELSE ${transactions.amount}::numeric END), 0)`
    })
        .from(transactions)
        .where(and(...conditions))

    const income = Number(row?.income ?? 0)
    const expense = Number(row?.expense ?? 0)

    return { income, expense, balance: income - expense }
}

const monthRange = (year: number, monthIndex: number): PeriodRange => ({
    start: new Date(year, monthIndex, 1),
    end: new Date(year, monthIndex + 1, 1)
})

export const getDashboard = async (userId: string) => {
    const now = new Date()
    const current = monthRange(now.getFullYear(), now.getMonth())
    const previous = monthRange(now.getFullYear(), now.getMonth() - 1)

    const [totals, currentMonth, previousMonth, recentRows] = await Promise.all([
        aggregatePeriod(userId),
        aggregatePeriod(userId, current),
        aggregatePeriod(userId, previous),
        db.select({
            id: transactions.id,
            amount: transactions.amount,
            description: transactions.description,
            date: transactions.date,
            typeTransaction: transactions.typeTransaction,
            categoryName: categories.name
        })
            .from(transactions)
            .leftJoin(assoTransactionsCategories, eq(transactions.id, assoTransactionsCategories.transactionId))
            .leftJoin(categories, eq(categories.id, assoTransactionsCategories.categoryId))
            .where(eq(transactions.userId, userId))
            .orderBy(desc(transactions.date))
            .limit(5)
    ])

    return {
        totals,
        currentMonth,
        previousMonth,
        recentTransactions: recentRows.map((row) => ({
            id: row.id,
            amount: Number(row.amount),
            description: decryptText(row.description || ''),
            date: row.date,
            typeTransaction: row.typeTransaction,
            categoryName: row.categoryName
        }))
    }
}
