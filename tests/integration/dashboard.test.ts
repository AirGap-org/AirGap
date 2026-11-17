import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#server/db'
import { transactions } from '~~/drizzle/schema'
import { getDashboard } from '#server/services/dashboard.service'
import { createUser, resetDb } from '../helpers/db'

const insertTransaction = async (
    userId: string,
    amount: string,
    typeTransaction: 'revenu' | 'depense',
    date: Date
) => {
    await db.insert(transactions).values({
        userId,
        typeTransaction,
        description: 'Dashboard test',
        devise: 'EUR',
        amount,
        recurrence: 'Aucune',
        startRecurrence: date,
        date
    })
}

describe('getDashboard', () => {
    beforeEach(async () => {
        await resetDb()
    })

    it('agrège les totaux et les mois courant/précédent en SQL', async () => {
        const user = await createUser()
        const now = new Date()
        const current = new Date(now.getFullYear(), now.getMonth(), 10)
        const previous = new Date(now.getFullYear(), now.getMonth() - 1, 10)

        await insertTransaction(user.id, '100', 'revenu', current)
        await insertTransaction(user.id, '40', 'depense', current)
        await insertTransaction(user.id, '50', 'revenu', previous)
        await insertTransaction(user.id, '10', 'depense', previous)

        const dashboard = await getDashboard(user.id)

        expect(dashboard.totals).toEqual({ income: 150, expense: 50, balance: 100 })
        expect(dashboard.currentMonth).toEqual({ income: 100, expense: 40, balance: 60 })
        expect(dashboard.previousMonth).toEqual({ income: 50, expense: 10, balance: 40 })
        expect(dashboard.recentTransactions).toHaveLength(4)
    })
})
