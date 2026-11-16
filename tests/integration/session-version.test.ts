import { beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { db } from '#server/db'
import { users } from '~~/drizzle/schema'
import {
    getUserSessionMeta,
    softDeleteUser,
    updateUserEmail,
    updateUserPassword,
    updateUserTwoFactor
} from '#server/services/user.service'
import { createUser, resetDb } from '../helpers/db'

describe('sessionVersion', () => {
    beforeEach(async () => {
        await resetDb()
    })

    it('incrémente la version à chaque action sensible', async () => {
        const user = await createUser()

        const [password] = await updateUserPassword(user.id, 'nouveau-hash')
        expect(password?.sessionVersion).toBe(1)

        const [email] = await updateUserEmail(user.id, 'Nouvelle-Adresse@Example.com')
        expect(email?.sessionVersion).toBe(2)

        const [twoFactor] = await updateUserTwoFactor(user.id, true, 'SECRET')
        expect(twoFactor?.sessionVersion).toBe(3)

        await softDeleteUser(user.id)

        const [row] = await db.select({ sessionVersion: users.sessionVersion, email: users.email })
            .from(users)
            .where(eq(users.id, user.id))

        expect(row?.sessionVersion).toBe(4)
        expect(row?.email).toContain('deleted-')
    })

    it('expose les métadonnées de session nécessaires au contrôle', async () => {
        const user = await createUser()
        await updateUserPassword(user.id, 'hash')

        const meta = await getUserSessionMeta(user.id)

        expect(meta?.id).toBe(user.id)
        expect(meta?.sessionVersion).toBe(1)
        expect(meta?.deletedAt).toBeNull()
    })
})
