import { beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db } from '#server/db'
import { budgets } from '~~/drizzle/schema'
import { deleteBudget, getBudgetById } from '#server/services/budgets.service'
import { budgetAssociations, createBudget, createCategory, createUser, resetDb } from '../helpers/db'

describe('budgets IDOR', () => {
    beforeEach(async () => {
        await resetDb()
    })

    it("ne supprime pas les associations d'un budget appartenant à un autre utilisateur", async () => {
        const victim = await createUser()
        const attacker = await createUser()
        const victimCategory = await createCategory(victim.id)
        const victimBudget = await createBudget(victim.id, victimCategory.id)

        const result = await deleteBudget(victimBudget.id, attacker.id)

        expect(result).toBeUndefined()

        const remaining = await db.query.budgets.findFirst({
            where: eq(budgets.id, victimBudget.id)
        })
        expect(remaining).toBeTruthy()

        const associations = await budgetAssociations(victimBudget.id)
        expect(associations).toHaveLength(1)
        expect(associations[0]?.categoryId).toBe(victimCategory.id)
    })

    it("ne retourne pas un budget appartenant à un autre utilisateur", async () => {
        const victim = await createUser()
        const attacker = await createUser()
        const category = await createCategory(victim.id)
        const budget = await createBudget(victim.id, category.id)

        expect(await getBudgetById(budget.id, attacker.id)).toBeNull()

        const owned = await getBudgetById(budget.id, victim.id)
        expect(owned?.id).toBe(budget.id)
        expect(owned?.categories).toHaveLength(1)
    })

    it('supprime bien le budget et ses associations pour le propriétaire', async () => {
        const owner = await createUser()
        const category = await createCategory(owner.id)
        const budget = await createBudget(owner.id, category.id)

        const result = await deleteBudget(budget.id, owner.id)

        expect(result?.id).toBe(budget.id)
        expect(await budgetAssociations(budget.id)).toHaveLength(0)
    })
})
