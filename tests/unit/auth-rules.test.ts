import { describe, expect, it } from 'vitest'
import { isUserActive } from '#server/utils/userStatus'
import { assertTwoFactorCanBeConfigured } from '#server/utils/twoFactor'

describe('isUserActive', () => {
    it('accepte un utilisateur non supprimé', () => {
        expect(isUserActive({ deletedAt: null })).toBe(true)
    })

    it('refuse un utilisateur supprimé ou absent', () => {
        expect(isUserActive({ deletedAt: new Date() })).toBe(false)
        expect(isUserActive(null)).toBe(false)
        expect(isUserActive(undefined)).toBe(false)
    })
})

describe('assertTwoFactorCanBeConfigured', () => {
    it('autorise la configuration quand la 2FA est inactive', () => {
        expect(() => assertTwoFactorCanBeConfigured(false)).not.toThrow()
        expect(() => assertTwoFactorCanBeConfigured(undefined)).not.toThrow()
    })

    it('refuse la reconfiguration quand la 2FA est déjà active', () => {
        try {
            assertTwoFactorCanBeConfigured(true)
            throw new Error('devrait échouer')
        } catch (error) {
            expect((error as { statusCode?: number }).statusCode).toBe(409)
        }
    })
})
