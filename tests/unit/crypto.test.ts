import crypto from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { decryptText, encryptText } from '#server/utils/crypto'
import { isWeakSecret } from '#server/utils/secrets'

const KEY = '0123456789abcdef0123456789abcdef'

const legacyEncrypt = (text: string): string => {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(KEY, 'utf8'), iv)
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const tag = cipher.getAuthTag().toString('hex')
    return `${iv.toString('hex')}:${tag}:${encrypted}`
}

describe('crypto', () => {
    it('chiffre et déchiffre en v2', () => {
        const encrypted = encryptText('donnée sensible')

        expect(encrypted.startsWith('v2:')).toBe(true)
        expect(decryptText(encrypted)).toBe('donnée sensible')
    })

    it('déchiffre encore les données au format v1', () => {
        const legacy = legacyEncrypt('ancienne donnée')

        expect(decryptText(legacy)).toBe('ancienne donnée')
    })

    it('refuse une donnée v2 altérée', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        const encrypted = encryptText('intégrité')
        const parts = encrypted.split(':')
        const cipher = parts[3] ?? ''
        parts[3] = `${cipher.slice(0, -1)}${cipher.endsWith('0') ? '1' : '0'}`

        expect(decryptText(parts.join(':'))).toBe('Donnée protégée')
    })

    it('retourne une chaîne vide pour une entrée vide', () => {
        expect(encryptText('')).toBe('')
    })
})

describe('isWeakSecret', () => {
    it('rejette les valeurs vides, courtes ou répétées', () => {
        expect(isWeakSecret(undefined)).toBe(true)
        expect(isWeakSecret('trop-court')).toBe(true)
        expect(isWeakSecret('0'.repeat(32))).toBe(true)
        expect(isWeakSecret('a'.repeat(32))).toBe(true)
    })

    it('accepte une clé aléatoire de 32 caractères', () => {
        expect(isWeakSecret(KEY)).toBe(false)
    })
})
