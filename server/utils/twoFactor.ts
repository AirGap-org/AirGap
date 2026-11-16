/**
 * Empêche de réinitialiser la 2FA depuis une simple session déjà authentifiée :
 * un porteur de session ne doit pas pouvoir remplacer le second facteur.
 */
export const assertTwoFactorCanBeConfigured = (enabled: boolean | null | undefined): void => {
    if (enabled) {
        throw createError({
            statusCode: 409,
            message: 'La 2FA est déjà activée. Désactivez-la avant de la reconfigurer.'
        })
    }
}
