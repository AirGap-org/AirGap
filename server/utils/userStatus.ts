/** Un utilisateur soft-deleted ne doit plus pouvoir utiliser ses sessions. */
export const isUserActive = <T extends { deletedAt: Date | null }>(user: T | null | undefined): user is T =>
    Boolean(user && !user.deletedAt)

/** Une session émise avant une action sensible ne doit plus être acceptée. */
export const isSessionVersionValid = (sessionVersion: number | undefined, currentVersion: number): boolean =>
    sessionVersion === currentVersion
