import { beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db } from '#server/db'
import { accounts } from '~~/drizzle/schema'
import { registerUser } from '#server/services/auth.service'
import { resetDb } from '../helpers/db'

describe('registerUser', () => {
    beforeEach(async () => {
        await resetDb()
    })

    it("ne renvoie jamais le hash du mot de passe ni le secret 2FA", async () => {
        const user = await registerUser({
            email: 'alice@example.com',
            password: 'mot-de-passe-solide',
            name: 'Alice'
        })

        expect(user).toBeTruthy()
        expect(user).not.toHaveProperty('password')
        expect(user).not.toHaveProperty('twoFactorSecret')
        expect(user?.email).toBe('alice@example.com')
    })

    it('crée le compte courant par défaut dans la même transaction', async () => {
        const user = await registerUser({
            email: 'bob@example.com',
            password: 'mot-de-passe-solide',
            name: 'Bob'
        })

        const userAccounts = await db.select().from(accounts).where(eq(accounts.userId, user!.id))

        expect(userAccounts).toHaveLength(1)
        expect(userAccounts[0]?.accountName).toBe('Compte Courant')
    })

    it('refuse un email déjà utilisé', async () => {
        const data = {
            email: 'doublon@example.com',
            password: 'mot-de-passe-solide',
            name: 'Doublon'
        }

        expect(await registerUser(data)).toBeTruthy()
        expect(await registerUser(data)).toBeNull()
    })
})
