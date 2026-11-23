import { eq, sql } from "drizzle-orm";
import { db } from "#server/db";
import { users } from "~~/drizzle/schema";
import { encryptText, decryptText } from "#server/utils/crypto";

export const getUserByEmail = async (email: string) => {
    return await db.query.users.findFirst({
        where: eq(users.email, email.trim().toLowerCase())
    });
}

/** Colonnes strictement nécessaires au contrôle de session (ne pas exposer au client). */
export const getUserSessionMeta = async (userId: string) => {
    return await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
            id: true,
            email: true,
            name: true,
            authProvider: true,
            twoFactorEnabled: true,
            deletedAt: true,
            sessionVersion: true
        }
    });
}

export const getUserById = async (userId: string) => {
    return await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
            id: true,
            email: true,
            name: true,
            authProvider: true,
            twoFactorEnabled: true,
            createdAt: true,
            updatedAt: true
        }
    });
}

export const softDeleteUser = async (userId: string) => {
    return db.update(users)
        .set({
            deletedAt: new Date(),
            email: `deleted-${userId}-${Date.now()}@deleted.com`,
            name: 'Utilisateur supprimé',
            sessionVersion: sql`${users.sessionVersion} + 1`
        })
        .where(eq(users.id, userId));
}

export const updateUserPassword = async (userId: string, newHashedPassword: string) => {
    const user = await getUserById(userId);
    if(user?.authProvider === 'local') {
        return db.update(users)
            .set({
                password: newHashedPassword,
                sessionVersion: sql`${users.sessionVersion} + 1`,
                updatedAt: new Date()
            })
            .where(eq(users.id, userId))
            .returning({ sessionVersion: users.sessionVersion });
    } else {
        throw new Error("Impossible de modifier le mot de passe pour un utilisateur avec un fournisseur d'authentification externe");
    }
}

/**
 * Remplace uniquement le hash de mot de passe (migration scrypt -> bcrypt).
 * Ne touche pas à sessionVersion : les sessions existantes restent valides.
 */
export const updateUserPasswordHash = async (userId: string, newHashedPassword: string) => {
    return db.update(users)
        .set({
            password: newHashedPassword,
            updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning({ id: users.id });
}

export const updateUserProfile = async (userId: string, name: string) => {
    return db.update(users)
        .set({
            name: name,
            updatedAt: new Date()
        })
        .where(eq(users.id, userId));
}

export const updateUserEmail = async (userId: string, email: string) => {
    const user = await getUserById(userId);
    if(user?.authProvider === 'local') {
        return db.update(users)
            .set({
                email: email.trim().toLowerCase(),
                sessionVersion: sql`${users.sessionVersion} + 1`,
                updatedAt: new Date()
            })
            .where(eq(users.id, userId))
            .returning({ sessionVersion: users.sessionVersion });
    } else {
        throw new Error("Impossible de modifier l'email pour un utilisateur avec un fournisseur d'authentification externe");
    }
}

export const updateUserTwoFactor = async (
    userId: string,
    twoFactorEnabled: boolean,
    twoFactorSecret: string | null
) => {
    return db.update(users)
        .set({
            twoFactorEnabled,
            twoFactorSecret: twoFactorSecret ? encryptText(twoFactorSecret) : null,
            sessionVersion: sql`${users.sessionVersion} + 1`,
            updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning({ sessionVersion: users.sessionVersion })
}

export const getUserTwoFactorSecret = async (userId: string) => {
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
            twoFactorSecret: true,
            twoFactorEnabled: true
        }
    })
    if (!user) return user
    return {
        ...user,
        twoFactorSecret: user.twoFactorSecret ? decryptText(user.twoFactorSecret) : null
    }
}
