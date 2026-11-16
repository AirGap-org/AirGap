import { useRuntimeConfig } from '#imports'

/**
 * Rate-limiting / lockout basé sur le storage Nitro.
 *
 * ⚠️ IMPORTANT — multi-instance :
 * Le storage Nitro est EN MÉMOIRE par défaut. En production multi-instance
 * (plusieurs containers/PM2 derrière un load-balancer), chaque instance
 * possède son propre compteur → un attaquant qui répartit ses requêtes sur
 * plusieurs instances contourne le lockout. Les compteurs sont aussi réinitialisés
 * à chaque redémarrage de conteneur.
 *
 * Pour un déploiement multi-instance, configurez un driver de storage partagé
 * pour ce namespace dans nuxt.config.js :
 *
 *   nitro: {
 *     storage: {
 *       cache: {
 *         driver: 'redis',
 *         url: process.env.REDIS_URL
 *       }
 *     }
 *   }
 *
 * Format de clé : `rl:<scope>:<key>` (ex. `rl:2fa:<userId>`).
 *
 * Seuils : par défaut 5 tentatives / 15 min de lockout, configurables via
 * runtimeConfig (RATE_LIMIT_MAX_ATTEMPTS / RATE_LIMIT_LOCKOUT_MINUTES).
 * Un scope peut surcharger ces seuils via le 4e argument (ex. 'login-email'
 * est plus permissif : 15 tentatives pour éviter qu'un attaquant ne verrouille
 * volontairement le compte d'une victime ciblée — DoS account-lockout).
 *
 * ⚠️ Vecteur résiduel assumé : un lockout dur par identifiant reste exploitable
 * pour un DoS ciblé (un compte reste verrouillable indéfiniment, 15 échecs toutes
 * les 15 min en boucle). Pour éliminer ce vecteur sans réintroduire le risque de
 * credential stuffing, envisager à terme : un CAPTCHA après N échecs, ou un
 * ralentissement progressif (délai croissant) sans blocage complet.
 */
const storage = useStorage('cache')

type RateLimitState = {
    attempts: number
    lockedUntil: number
}

/**
 * Lit la config au moment de l'appel (contexte de requête), pas à l'import.
 */
const getThresholds = (maxAttemptsOverride?: number) => {
    const config = useRuntimeConfig()
    const defaultMax: number = Number(config.rateLimit?.maxAttempts) || 5
    const lockoutMs: number = (Number(config.rateLimit?.lockoutMinutes) || 15) * 60 * 1000
    return {
        maxAttempts: maxAttemptsOverride ?? defaultMax,
        lockoutMs
    }
}

export const checkRateLimit = async (scope: string, key: string): Promise<{ allowed: boolean; retryAfterSec: number }> => {
    const storageKey = `rl:${scope}:${key}`
    const now = Date.now()
    const state = (await storage.getItem<RateLimitState>(storageKey)) ?? { attempts: 0, lockedUntil: 0 }

    if (state.lockedUntil > now) {
        return { allowed: false, retryAfterSec: Math.ceil((state.lockedUntil - now) / 1000) }
    }

    return { allowed: true, retryAfterSec: 0 }
}

export const consumeRateLimitAttempt = async (scope: string, key: string, maxAttemptsOverride?: number): Promise<{ allowed: boolean; retryAfterSec: number; remaining: number }> => {
    const storageKey = `rl:${scope}:${key}`
    const now = Date.now()
    const state = (await storage.getItem<RateLimitState>(storageKey)) ?? { attempts: 0, lockedUntil: 0 }

    if (state.lockedUntil > now) {
        return { allowed: false, retryAfterSec: Math.ceil((state.lockedUntil - now) / 1000), remaining: 0 }
    }

    const { maxAttempts, lockoutMs } = getThresholds(maxAttemptsOverride)

    state.attempts += 1
    let remaining = maxAttempts - state.attempts

    if (state.attempts >= maxAttempts) {
        state.lockedUntil = now + lockoutMs
        state.attempts = 0
        remaining = 0
    }

    await storage.setItem(storageKey, state)

    return { allowed: remaining > 0, retryAfterSec: remaining === 0 ? Math.ceil(lockoutMs / 1000) : 0, remaining }
}

export const resetRateLimit = async (scope: string, key: string): Promise<void> => {
    await storage.removeItem(`rl:${scope}:${key}`)
}
