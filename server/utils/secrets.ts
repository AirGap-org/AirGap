const KNOWN_WEAK_VALUES = new Set([
    'change-me',
    'changeme',
    'secret',
    'password',
    'airgap',
])

/**
 * Détecte les secrets manifestement faibles ou laissés à leur valeur d'exemple.
 * Ne remplace pas une politique de génération aléatoire, mais bloque les cas
 * les plus dangereux (zéros, valeur répétée, mot de passe documenté).
 */
export const isWeakSecret = (value: string | undefined, minLength = 32): boolean => {
    if (!value || value.length < minLength) return true
    if (/^0+$/.test(value)) return true
    if (new Set(value).size < 8) return true

    return KNOWN_WEAK_VALUES.has(value.toLowerCase())
}
