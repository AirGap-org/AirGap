import { z } from 'zod'
import { verifyTOTP } from '@oslojs/otp'
import { decodeBase32 } from '@oslojs/encoding'
import { getUserTwoFactorSecret, updateUserTwoFactor } from '#server/services/user.service'
import { checkRateLimit, consumeRateLimitAttempt, resetRateLimit } from '#server/utils/rateLimit'
import { updateUserSession } from '#server/utils/auth'

const schema = z.object({
    code: z.string().length(6)
})

export default defineEventHandler(async (event) => {
    const session = await requireAuth(event)
    const result = await readValidatedBody(event, body => schema.safeParse(body))

    if (!result.success) {
        throw createError({ statusCode: 400, message: 'Code invalide' })
    }

    const user = await getUserTwoFactorSecret(session.id)

    if (!user?.twoFactorEnabled || !user?.twoFactorSecret) {
        throw createError({ statusCode: 400, message: '2FA non activée' })
    }

    const rl = await checkRateLimit('2fa-disable', session.id)
    if (!rl.allowed) {
        throw createError({ statusCode: 429, message: `Trop de tentatives. Réessayez dans ${rl.retryAfterSec}s.` })
    }

    const secretBytes = decodeBase32(user.twoFactorSecret)
    const isValid = verifyTOTP(secretBytes, 30, 6, result.data.code)

    if (!isValid) {
        const attempt = await consumeRateLimitAttempt('2fa-disable', session.id)
        if (!attempt.allowed) {
            throw createError({ statusCode: 429, message: `Trop de tentatives. Compte verrouillé ${attempt.retryAfterSec}s.` })
        }
        throw createError({ statusCode: 400, message: `Code incorrect. ${attempt.remaining} tentative(s) restante(s).` })
    }

    await resetRateLimit('2fa-disable', session.id)

    const [updated] = await updateUserTwoFactor(session.id, false, null)

    await updateUserSession(event, {
        twoFactorEnabled: false,
        ...(updated ? { sessionVersion: updated.sessionVersion } : {})
    })

    return { success: true }
})
