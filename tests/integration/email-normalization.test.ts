import { beforeEach, describe, expect, it } from 'vitest'
import { registerUser } from '#server/services/auth.service'
import { getUserByEmail } from '#server/services/user.service'
import { resetDb } from '../helpers/db'

describe('normalisation des emails', () => {
    beforeEach(async () => {
        await resetDb()
    })

    it('stocke et retrouve les emails en minuscules', async () => {
        const user = await registerUser({
            email: 'Alice.Dupont@Example.COM',
            password: 'mot-de-passe-solide',
            name: 'Alice'
        })

        expect(user?.email).toBe('alice.dupont@example.com')

        const found = await getUserByEmail('ALICE.DUPONT@EXAMPLE.COM')
        expect(found?.id).toBe(user?.id)
    })

    it('refuse un doublon qui ne diffère que par la casse', async () => {
        const data = {
            email: 'doublon@example.com',
            password: 'mot-de-passe-solide',
            name: 'Doublon'
        }

        expect(await registerUser(data)).toBeTruthy()
        expect(await registerUser({ ...data, email: 'DOUBLON@example.com' })).toBeNull()
    })
})
