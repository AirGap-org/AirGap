import { randomUUID } from 'node:crypto'
import { eq, sql } from 'drizzle-orm'
import { db } from '#server/db'
import {
    accounts,
    assoBudgetCategories,
    assoTransactionsCategories,
    budgets,
    categories,
    transactions,
    users
} from '~~/drizzle/schema'

const TABLES = [
    'assoTransactionsCategories',
    'assoBudgetCategories',
    'assoAccountsCategories',
    'transactions',
    'budgets',
    'categories',
    'accounts',
    'senderRecipient',
    'recurrences',
    'users'
]

const getDatabaseName = (): string => {
    try {
        return new URL(process.env.NUXT_DATABASE_URL || '').pathname.replace(/^\//, '')
    } catch {
        return ''
    }
}

export const assertSafeTestDatabase = (): void => {
    const databaseName = getDatabaseName()
    const isDedicatedTestDatabase = /(^|_)(test|preview|ci)$/.test(databaseName)

    if (!process.env.VITEST || !isDedicatedTestDatabase) {
        throw new Error(
            `Refus de vider la base "${databaseName || 'inconnue'}". ` +
            'Les tests doivent cibler une base dédiée dont le nom finit par _test, _preview ou _ci.'
        )
    }
}

const DEFAULT_CATEGORIES: Array<{
    name: string
    typeTransaction: 'depense' | 'revenu' | 'non_categorise'
}> = [
    { name: 'Salaire & Pro', typeTransaction: 'revenu' },
    { name: 'Aides & Pensions', typeTransaction: 'revenu' },
    { name: 'Alimentation & Quotidien', typeTransaction: 'depense' },
    { name: 'Logement & Factures', typeTransaction: 'depense' },
    { name: 'Loisirs & Achats', typeTransaction: 'depense' },
    { name: 'Transports', typeTransaction: 'depense' },
    { name: 'Virements', typeTransaction: 'non_categorise' },
    { name: 'Non catégorisé', typeTransaction: 'non_categorise' }
]

export const seedDefaultCategories = async (): Promise<void> => {
    await db.insert(categories).values(DEFAULT_CATEGORIES.map(category => ({
        ...category,
        userId: null,
        isDefault: true
    })))
}

export const resetDb = async (): Promise<void> => {
    assertSafeTestDatabase()
    await db.execute(sql.raw(`TRUNCATE TABLE ${TABLES.map(t => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`))
    await seedDefaultCategories()
}

export const createUser = async (overrides: Partial<typeof users.$inferInsert> = {}) => {
    const [user] = await db.insert(users).values({
        email: overrides.email ?? `user-${randomUUID()}@example.com`,
        name: overrides.name ?? 'Test User',
        authProvider: 'local',
        ...overrides
    }).returning()

    if (!user) throw new Error('User not created')
    return user
}

export const createAccount = async (userId: string) => {
    const [account] = await db.insert(accounts).values({
        userId,
        accountName: 'Compte Test',
        accountType: 'Courant',
        balance: '0',
        currency: 'EUR'
    }).returning()

    if (!account) throw new Error('Account not created')
    return account
}

export const createCategory = async (userId: string, name = `Catégorie ${randomUUID()}`) => {
    const [category] = await db.insert(categories).values({
        userId,
        name,
        typeTransaction: 'depense'
    }).returning()

    if (!category) throw new Error('Category not created')
    return category
}

export const createTransaction = async (userId: string, categoryId: string, description = 'Transaction test') => {
    const [transaction] = await db.insert(transactions).values({
        userId,
        typeTransaction: 'depense',
        description,
        devise: 'EUR',
        amount: '10',
        recurrence: 'Aucune',
        startRecurrence: new Date('2026-01-01T00:00:00Z'),
        date: new Date('2026-01-01T00:00:00Z')
    }).returning()

    if (!transaction) throw new Error('Transaction not created')

    await db.insert(assoTransactionsCategories).values({
        transactionId: transaction.id,
        categoryId
    })

    return transaction
}

export const createBudget = async (userId: string, categoryId: string, name = 'Budget test') => {
    const [budget] = await db.insert(budgets).values({
        userId,
        name,
        amount: '100',
        recurrence: 'Aucune',
        startRecurrence: new Date('2026-01-01T00:00:00Z'),
        startDate: new Date('2026-01-01T00:00:00Z'),
        endDate: new Date('2026-12-31T00:00:00Z')
    }).returning()

    if (!budget) throw new Error('Budget not created')

    await db.insert(assoBudgetCategories).values({
        budgetId: budget.id,
        categoryId
    })

    return budget
}

export const transactionAssociations = async (transactionId: string) =>
    db.select().from(assoTransactionsCategories).where(eq(assoTransactionsCategories.transactionId, transactionId))

export const budgetAssociations = async (budgetId: string) =>
    db.select().from(assoBudgetCategories).where(eq(assoBudgetCategories.budgetId, budgetId))
