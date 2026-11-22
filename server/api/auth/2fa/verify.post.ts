import { z } from 'zod'
import { verifyTOTP } from '@oslojs/otp'
import { decodeBase32 } from '@oslojs/encoding'
import { getUserSessionMeta, getUserTwoFactorSecret } from '#server/services/user.service'
import { isSessionVersionValid, isUserActive } from '#server/utils/userStatus'
import { checkRateLimit, consumeRateLimitAttempt, resetRateLimit } from '#server/utils/rateLimit'
import { requirePendingTwoFactor } from '#server/utils/auth'

const schema = z.object({
    code: z.string().length(6)
})

export default defineEventHandler(async (event) => {
    const session = await requirePendingTwoFactor(event)

    // Le compte a pu être supprimé, la 2FA désactivée ou le mot de passe changé
    // depuis l'émission du cookie de session en attente.
    const dbUser = await getUserSessionMeta(session.user.id)

    if (
        !isUserActive(dbUser)
        || !dbUser.twoFactorEnabled
        || !isSessionVersionValid(session.user.sessionVersion, dbUser.sessionVersion)
    ) {
        await clearUserSession(event)
        throw createError({ statusCode: 401, message: 'Session invalide ou expirée' })
    }

    const result = await readValidatedBody(event, body => schema.safeParse(body))
    if (!result.success) {
        throw createError({ statusCode: 400, message: 'Code invalide' })
    }

    const user = await getUserTwoFactorSecret(session.user.id)

    if (!user?.twoFactorSecret) {
        throw createError({ statusCode: 400, message: '2FA non configurée' })
    }

    // Protection contre le brute-force du code TOTP
    const rl = await checkRateLimit('2fa', session.user.id)
    if (!rl.allowed) {
        throw createError({ statusCode: 429, message: `Trop de tentatives. Réessayez dans ${rl.retryAfterSec}s.` })
    }

    const secretBytes = decodeBase32(user.twoFactorSecret)
    const isValid = verifyTOTP(secretBytes, 30, 6, result.data.code)

    if (!isValid) {
        const result = await consumeRateLimitAttempt('2fa', session.user.id)
        if (!result.allowed) {
            throw createError({ statusCode: 429, message: `Trop de tentatives. Compte verrouillé ${result.retryAfterSec}s.` })
        }
        throw createError({ statusCode: 400, message: `Code incorrect. ${result.remaining} tentative(s) restante(s).` })
    }

    await resetRateLimit('2fa', session.user.id)

    await setUserSession(event, {
        user: {
            ...session.user,
            sessionVersion: dbUser.sessionVersion
        },
        secure: { twoFactorPending: false },
        loggedInAt: new Date()
    })

    return { success: true }
})
