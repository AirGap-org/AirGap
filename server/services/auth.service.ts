import { getUserByEmail } from '#server/services/user.service'
import { hashUserPassword, verifyUserPassword } from '#server/utils/hashing'
import { getErrorCode } from '#server/utils/errors'
import { db } from '#server/db'
import { accounts, users } from '~~/drizzle/schema'

let dummyHash: string | null = null

const getDummyHash = async () => {
    if (!dummyHash) {
        dummyHash = await hashUserPassword('dummy-password-for-timing-safety')
    }
    return dummyHash
}

/**
 * Champs sûrs à renvoyer au client : jamais de hash ni de secret 2FA.
 */
const publicUserColumns = {
    id: users.id,
    email: users.email,
    name: users.name,
    authProvider: users.authProvider,
    twoFactorEnabled: users.twoFactorEnabled,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt
}

/**
 * Gère l'inscription complète d'un utilisateur.
 * L'utilisateur et son compte courant sont créés dans la même transaction.
 * Retourne null si l'email est déjà pris (le handler gère l'erreur HTTP).
 */
export const registerUser = async (data: typeof users.$inferInsert) => {
    const existingUser = await getUserByEmail(data.email)
    if (existingUser) return null

    if (!data.password) {
        throw createError({ statusCode: 400, message: 'Mot de passe requis' })
    }

    const hashedPassword = await hashUserPassword(data.password)

    try {
        return await db.transaction(async (tx) => {
            const [newUser] = await tx.insert(users)
                .values({
                    ...data,
                    password: hashedPassword
                })
                .returning(publicUserColumns)

            if (!newUser) {
                throw createError({ statusCode: 500, message: 'Utilisateur non créé' })
            }

            await tx.insert(accounts).values({
                userId: newUser.id,
                accountName: 'Compte Courant',
                accountType: 'Courant',
                balance: '0',
                currency: 'EUR'
            })

            return newUser
        })
    } catch (error) {
        // Course entre deux inscriptions simultanées : la contrainte unique tranche.
        if (getErrorCode(error) === '23505') return null
        throw error
    }
}

/**
 * Gère la logique de connexion
 * Retourne null si les identifiants sont invalides
 */
export const loginUser = async (email: string, passwordPlain: string) => {
    const user = await getUserByEmail(email)

    const isMatch = await verifyUserPassword(user?.password ?? await getDummyHash(), passwordPlain)

    if (!user || !isMatch) return null

    if (user.deletedAt) {
        throw createError({
            statusCode: 403,
            message: 'Ce compte a été supprimé.'
        })
    }

    return user
}
