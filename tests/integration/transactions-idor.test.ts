import { beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db } from '#server/db'
import { transactions } from '~~/drizzle/schema'
import { deleteTransaction, updateTransaction } from '#server/services/transactions.service'
import {
    createCategory,
    createTransaction,
    createUser,
    resetDb,
    transactionAssociations
} from '../helpers/db'

describe('transactions IDOR', () => {
    beforeEach(async () => {
        await resetDb()
    })

    it("ne supprime pas les associations d'une transaction appartenant à un autre utilisateur", async () => {
        const victim = await createUser()
        const attacker = await createUser()
        const victimCategory = await createCategory(victim.id)
        const victimTransaction = await createTransaction(victim.id, victimCategory.id)

        const result = await deleteTransaction(victimTransaction.id, attacker.id)

        expect(result).toBeUndefined()

        const remaining = await db.query.transactions.findFirst({
            where: eq(transactions.id, victimTransaction.id)
        })
        expect(remaining).toBeTruthy()

        const associations = await transactionAssociations(victimTransaction.id)
        expect(associations).toHaveLength(1)
        expect(associations[0]?.categoryId).toBe(victimCategory.id)
    })

    it("ne modifie pas la catégorie d'une transaction appartenant à un autre utilisateur", async () => {
        const victim = await createUser()
        const attacker = await createUser()
        const victimCategory = await createCategory(victim.id)
        const attackerCategory = await createCategory(attacker.id)
        const victimTransaction = await createTransaction(victim.id, victimCategory.id)

        const result = await updateTransaction(
            victimTransaction.id,
            attacker.id,
            { description: 'piraté' },
            attackerCategory.id
        )

        expect(result).toBeUndefined()

        const associations = await transactionAssociations(victimTransaction.id)
        expect(associations).toHaveLength(1)
        expect(associations[0]?.categoryId).toBe(victimCategory.id)

        const remaining = await db.query.transactions.findFirst({
            where: eq(transactions.id, victimTransaction.id)
        })
        expect(remaining?.description).not.toBe('piraté')
    })

    it('supprime bien la transaction et ses associations pour le propriétaire', async () => {
        const owner = await createUser()
        const category = await createCategory(owner.id)
        const transaction = await createTransaction(owner.id, category.id)

        const result = await deleteTransaction(transaction.id, owner.id)

        expect(result?.id).toBe(transaction.id)
        expect(await transactionAssociations(transaction.id)).toHaveLength(0)
    })
})
