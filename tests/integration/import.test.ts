import { beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db } from '#server/db'
import { categories, transactions } from '~~/drizzle/schema'
import { importTransactionsBulk } from '#server/services/transactions.service'
import { createAccount, createUser, resetDb } from '../helpers/db'

describe('importTransactionsBulk', () => {
    beforeEach(async () => {
        await resetDb()
    })

    it('crée les catégories inconnues pour l’utilisateur courant, jamais en global', async () => {
        const user = await createUser()
        const categoryName = `Catégorie import ${Date.now()}`

        const transaction = {
            date: new Date('2026-02-01T00:00:00Z'),
            description: 'Achat importé',
            amount: 42,
            typeTransaction: 'depense' as const,
            categoryName
        }

        const count = await importTransactionsBulk(user.id, [transaction])

        expect(count).toBe(1)

        // Un second import identique doit être ignoré grâce à la signature.
        expect(await importTransactionsBulk(user.id, [transaction])).toBe(0)

        const created = await db.query.categories.findFirst({
            where: eq(categories.name, categoryName)
        })

        expect(created).toBeTruthy()
        expect(created?.userId).toBe(user.id)
    })

    it('conserve le compte fourni quand il appartient à l’utilisateur', async () => {
        const user = await createUser()
        const account = await createAccount(user.id)

        await importTransactionsBulk(user.id, [{
            date: new Date('2026-03-01T00:00:00Z'),
            description: 'Transaction avec compte',
            amount: 12,
            typeTransaction: 'depense',
            accountId: account.id
        }])

        const imported = await db.query.transactions.findFirst({
            where: eq(transactions.description, 'Transaction avec compte')
        })

        // La description est chiffrée : on retrouve donc la ligne par montant.
        const rows = await db.select().from(transactions).where(eq(transactions.accountId, account.id))

        expect(imported).toBeUndefined()
        expect(rows).toHaveLength(1)
    })
})
