import { and, asc, eq, sql } from 'drizzle-orm'
import { db } from '#server/db'
import { accounts, budgets, transactions } from '~~/drizzle/schema'
import type { AccountType } from '~~/shared/accountTypes'

export type AccountInput = {
    accountName: string
    accountType: AccountType
    accountTypeLabel?: string | null
    openingBalance?: number
}

export type AccountUpdate = {
    accountName?: string
    accountType?: AccountType
    accountTypeLabel?: string | null
    isArchived?: boolean
}

const currentBalanceExpression = sql<string>`
    COALESCE(${accounts.balance}, 0) + COALESCE(SUM(
        CASE
            WHEN ${transactions.typeTransaction} = 'revenu' THEN ${transactions.amount}::numeric
            ELSE -${transactions.amount}::numeric
        END
    ), 0)
`

export const getAccountsWithBalances = async (userId: string, includeArchived = true) => {
    const conditions = [eq(accounts.userId, userId)]
    if (!includeArchived) {
        conditions.push(eq(accounts.isArchived, false))
    }

    const rows = await db.select({
        id: accounts.id,
        accountName: accounts.accountName,
        accountType: accounts.accountType,
        accountTypeLabel: accounts.accountTypeLabel,
        openingBalance: accounts.balance,
        currency: accounts.currency,
        isArchived: accounts.isArchived,
        createdAt: accounts.createdAt,
        currentBalance: currentBalanceExpression
    })
        .from(accounts)
        .leftJoin(transactions, eq(transactions.accountId, accounts.id))
        .where(and(...conditions))
        .groupBy(
            accounts.id,
            accounts.accountName,
            accounts.accountType,
            accounts.accountTypeLabel,
            accounts.balance,
            accounts.currency,
            accounts.isArchived,
            accounts.createdAt
        )
        .orderBy(asc(accounts.createdAt))

    return rows.map((row) => ({
        ...row,
        openingBalance: Number(row.openingBalance),
        currentBalance: Number(row.currentBalance)
    }))
}

export const getAccountWithBalance = async (userId: string, accountId: string) => {
    const rows = await getAccountsWithBalances(userId)
    return rows.find((account) => account.id === accountId) ?? null
}

export const ensureDefaultAccount = async (userId: string) => {
    const [existing] = await db.select()
        .from(accounts)
        .where(and(eq(accounts.userId, userId), eq(accounts.isArchived, false)))
        .orderBy(asc(accounts.createdAt))
        .limit(1)

    if (existing) return existing

    const [created] = await db.insert(accounts).values({
        userId,
        accountName: 'Compte Courant',
        accountType: 'courant',
        accountTypeLabel: null,
        balance: '0',
        currency: 'EUR',
        isArchived: false
    }).returning()

    if (!created) {
        throw createError({ statusCode: 500, message: 'Impossible de créer le compte par défaut' })
    }

    return created
}

export const createAccount = async (userId: string, data: AccountInput) => {
    const [created] = await db.insert(accounts).values({
        userId,
        accountName: data.accountName.trim(),
        accountType: data.accountType,
        accountTypeLabel: data.accountType === 'autre' ? (data.accountTypeLabel?.trim() || null) : null,
        balance: String(data.openingBalance ?? 0),
        currency: 'EUR',
        isArchived: false
    }).returning()

    if (!created) {
        throw createError({ statusCode: 500, message: 'Impossible de créer le compte' })
    }

    return created
}

export const updateAccount = async (userId: string, accountId: string, data: AccountUpdate) => {
    const [existing] = await db.select()
        .from(accounts)
        .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
        .limit(1)

    if (!existing) return null

    const nextType = data.accountType ?? existing.accountType
    const nextLabel = nextType === 'autre'
        ? (data.accountTypeLabel !== undefined ? (data.accountTypeLabel?.trim() || null) : existing.accountTypeLabel)
        : null

    const [updated] = await db.update(accounts)
        .set({
            accountName: data.accountName?.trim() ?? existing.accountName,
            accountType: nextType,
            accountTypeLabel: nextLabel,
            isArchived: data.isArchived ?? existing.isArchived,
            updatedAt: new Date()
        })
        .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
        .returning()

    return updated ?? null
}

export const deleteAccount = async (userId: string, accountId: string) => {
    const [existing] = await db.select()
        .from(accounts)
        .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
        .limit(1)

    if (!existing) return { deleted: false, reason: 'not_found' as const }

    const [transactionCount] = await db.select({ count: sql<number>`count(*)::int` })
        .from(transactions)
        .where(eq(transactions.accountId, accountId))

    if (Number(transactionCount?.count ?? 0) > 0) {
        return { deleted: false, reason: 'transactions' as const }
    }

    const [budgetCount] = await db.select({ count: sql<number>`count(*)::int` })
        .from(budgets)
        .where(eq(budgets.accountId, accountId))

    if (Number(budgetCount?.count ?? 0) > 0) {
        return { deleted: false, reason: 'budgets' as const }
    }

    await db.delete(accounts)
        .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))

    return { deleted: true as const }
}
