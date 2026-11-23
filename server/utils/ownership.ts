import { and, eq, inArray } from 'drizzle-orm'
import { db } from '#server/db'
import { accounts } from '~~/drizzle/schema'

/**
 * Vérifie qu'un compte appartient bien à l'utilisateur courant.
 * À appeler avant tout rattachement d'une entité (transaction, budget...) à un accountId
 * fourni par le client, pour empêcher l'IDOR cross-user.
 *
 * @throws 403 si le compte n'existe pas ou n'appartient pas à l'utilisateur.
 */
export const assertAccountOwnership = async (accountId: string | null | undefined, userId: string): Promise<void> => {
    if (!accountId) return

    const ownedAccount = await db.query.accounts.findFirst({
        where: and(eq(accounts.id, accountId), eq(accounts.userId, userId))
    })

    if (!ownedAccount) {
        throw createError({ statusCode: 403, message: 'Compte invalide ou non autorisé' })
    }
}

/** Vérifie qu'un compte peut recevoir de nouvelles transactions. */
export const assertAccountAvailable = async (accountId: string, userId: string): Promise<void> => {
    const account = await db.query.accounts.findFirst({
        where: and(eq(accounts.id, accountId), eq(accounts.userId, userId), eq(accounts.isArchived, false))
    })

    if (!account) {
        throw createError({ statusCode: 403, message: 'Compte invalide, archivé ou non autorisé' })
    }
}

/** Variante groupée, en une seule requête, pour les imports. */
export const assertAccountsOwnership = async (accountIds: string[] | undefined, userId: string): Promise<void> => {
    if (!accountIds?.length) return

    const uniqueIds = [...new Set(accountIds)]

    const ownedAccounts = await db.select({ id: accounts.id })
        .from(accounts)
        .where(and(inArray(accounts.id, uniqueIds), eq(accounts.userId, userId)))

    if (ownedAccounts.length !== uniqueIds.length) {
        throw createError({ statusCode: 403, message: 'Un compte est invalide ou non autorisé' })
    }
}

/** Variante groupée qui refuse aussi les comptes archivés. */
export const assertAccountsAvailable = async (accountIds: string[] | undefined, userId: string): Promise<void> => {
    if (!accountIds?.length) return

    const uniqueIds = [...new Set(accountIds)]

    const availableAccounts = await db.select({ id: accounts.id })
        .from(accounts)
        .where(and(
            inArray(accounts.id, uniqueIds),
            eq(accounts.userId, userId),
            eq(accounts.isArchived, false)
        ))

    if (availableAccounts.length !== uniqueIds.length) {
        throw createError({ statusCode: 403, message: 'Un compte est invalide, archivé ou non autorisé' })
    }
}
