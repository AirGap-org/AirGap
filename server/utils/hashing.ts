import {compare, hash} from 'bcrypt'
import {Hash} from '@adonisjs/hash'
import {Scrypt} from '@adonisjs/hash/drivers/scrypt'

const SALT_ROUNDS = 10
const LEGACY_SCRYPT_PREFIX = '$scrypt$'
const legacyHasher = new Hash(new Scrypt({}))

/**
 * Les comptes créés avant la migration bcrypt utilisent le format scrypt de
 * nuxt-auth-utils ($scrypt$...). On doit continuer à les vérifier.
 */
export const isLegacyPasswordHash = (hashedPassword: string | null | undefined): boolean =>
    typeof hashedPassword === 'string' && hashedPassword.startsWith(LEGACY_SCRYPT_PREFIX)

/**
 * Hache un mot de passe en clair.
 * À utiliser lors de l'inscription (Register).
 */
export const hashUserPassword = async (password: string): Promise<string> => {
    return await hash(password, SALT_ROUNDS)
}

/**
 * Vérifie un mot de passe contre un hash bcrypt ou scrypt legacy.
 * * @param hashedUserPassword - hash venant de la DB
 * @param plainPassword - mot de passe saisi par l'utilisateur
 */
export const verifyUserPassword = async (hashedUserPassword: string, plainPassword: string): Promise<boolean> => {
    if (!hashedUserPassword) return false

    try {
        if (isLegacyPasswordHash(hashedUserPassword)) {
            return await legacyHasher.verify(hashedUserPassword, plainPassword)
        }

        return await compare(plainPassword, hashedUserPassword)
    } catch {
        return false
    }
}
