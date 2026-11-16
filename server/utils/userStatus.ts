/** Un utilisateur soft-deleted ne doit plus pouvoir utiliser ses sessions. */
export const isUserActive = <T extends { deletedAt: Date | null }>(user: T | null | undefined): user is T =>
    Boolean(user && !user.deletedAt)
