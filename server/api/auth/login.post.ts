import {z} from 'zod'
import {loginUser} from "#server/services/auth.service";
import {checkRateLimit, consumeRateLimitAttempt, resetRateLimit} from '#server/utils/rateLimit';
import {getClientIP} from '#server/utils/clientIP';
import { establishUserSession } from '#server/utils/auth';

const loginSchema = z.object({
    email: z.string().trim().toLowerCase().email().max(255),
    password: z.string().min(1).max(1024)
})

export default defineEventHandler(async (event) => {
    const clientIP = getClientIP(event)

    // Rate-limit par IP (anti brute-force depuis une seule source)
    const rl = await checkRateLimit('login', clientIP)
    if (!rl.allowed) {
        throw createError({statusCode: 429, message: `Trop de tentatives. Réessayez dans ${rl.retryAfterSec}s.`})
    }

    const result = await readValidatedBody(event, body => loginSchema.safeParse(body))
    if (!result.success) {
        throw createError({statusCode: 400, message: 'Données invalides'})
    }

    // Rate-limit par email (anti credential stuffing distribué : 1 essai/IP mais
    // des dizaines d'IP sur le même compte cible). Seuil plus élevé (15) que l'IP
    // pour limiter le DoS par verrouillage volontaire d'un compte ciblé.
    const emailKey = result.data.email.toLowerCase()
    const EMAIL_MAX_ATTEMPTS = 15
    const rlEmail = await checkRateLimit('login-email', emailKey)
    if (!rlEmail.allowed) {
        throw createError({statusCode: 429, message: `Trop de tentatives sur ce compte. Réessayez dans ${rlEmail.retryAfterSec}s.`})
    }

    const user = await loginUser(result.data.email, result.data.password)

    if (!user) {
        const attempt = await consumeRateLimitAttempt('login', clientIP)
        await consumeRateLimitAttempt('login-email', emailKey, EMAIL_MAX_ATTEMPTS)
        throw createError({
            statusCode: 401,
            message: attempt.allowed
                ? `Email ou mot de passe incorrect. ${attempt.remaining} tentative(s) restante(s).`
                : `Trop de tentatives. Compte verrouillé ${attempt.retryAfterSec}s.`
        })
    }

    await resetRateLimit('login', clientIP)
    await resetRateLimit('login-email', emailKey)

    await establishUserSession(event, {
        id: user.id,
        email: user.email,
        name: user.name,
        authProvider: user.authProvider ?? 'local',
        twoFactorEnabled: user.twoFactorEnabled,
        sessionVersion: user.sessionVersion
    })

    return user.twoFactorEnabled ? { requiresTwoFactor: true } : { success: true }
})
