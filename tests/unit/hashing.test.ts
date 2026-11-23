import { beforeAll, describe, expect, it } from 'vitest'
import { Hash } from '@adonisjs/hash'
import { Scrypt } from '@adonisjs/hash/drivers/scrypt'
import { hashUserPassword, isLegacyPasswordHash, verifyUserPassword } from '#server/utils/hashing'

const PASSWORD = 'mot-de-passe-legacy'
let legacyHash = ''

beforeAll(async () => {
    const hasher = new Hash(new Scrypt({}))
    legacyHash = await hasher.make(PASSWORD)
})

describe('hashing', () => {
    it('détecte les hashes legacy scrypt', () => {
        expect(legacyHash.startsWith('$scrypt$')).toBe(true)
        expect(isLegacyPasswordHash(legacyHash)).toBe(true)
        expect(isLegacyPasswordHash('$2b$10$abcdef')).toBe(false)
        expect(isLegacyPasswordHash(null)).toBe(false)
        expect(isLegacyPasswordHash(undefined)).toBe(false)
    })

    it('vérifie un hash legacy scrypt', async () => {
        expect(await verifyUserPassword(legacyHash, PASSWORD)).toBe(true)
        expect(await verifyUserPassword(legacyHash, 'mauvais-mot-de-passe')).toBe(false)
    })

    it('continue de vérifier les hashes bcrypt', async () => {
        const bcryptHash = await hashUserPassword(PASSWORD)

        expect(bcryptHash.startsWith('$2')).toBe(true)
        expect(isLegacyPasswordHash(bcryptHash)).toBe(false)
        expect(await verifyUserPassword(bcryptHash, PASSWORD)).toBe(true)
        expect(await verifyUserPassword(bcryptHash, 'mauvais-mot-de-passe')).toBe(false)
    })

    it('refuse un hash vide ou corrompu', async () => {
        expect(await verifyUserPassword('', PASSWORD)).toBe(false)
        expect(await verifyUserPassword('$scrypt$invalide', PASSWORD)).toBe(false)
        expect(await verifyUserPassword('$2b$10$invalide', PASSWORD)).toBe(false)
    })
})
