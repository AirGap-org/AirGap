import { createTOTPKeyURI } from '@oslojs/otp'
import { encodeBase32 } from '@oslojs/encoding'
import QRCode from 'qrcode'
import { getUserTwoFactorSecret, updateUserTwoFactor } from '#server/services/user.service'
import { checkRateLimit, consumeRateLimitAttempt } from '#server/utils/rateLimit'
import { assertTwoFactorCanBeConfigured } from '#server/utils/twoFactor'
import { updateUserSession } from '#server/utils/auth'

export default defineEventHandler(async (event) => {
    const session = await requireAuth(event)

    const current = await getUserTwoFactorSecret(session.id)

    // Empêche un porteur de session de remplacer la 2FA sans vérifier l'ancien facteur.
    assertTwoFactorCanBeConfigured(current?.twoFactorEnabled)

    const rl = await checkRateLimit('2fa-setup', session.id)
    if (!rl.allowed) {
        throw createError({ statusCode: 429, message: `Trop de tentatives. Réessayez dans ${rl.retryAfterSec}s.` })
    }

    const attempt = await consumeRateLimitAttempt('2fa-setup', session.id, 10)
    if (!attempt.allowed) {
        throw createError({ statusCode: 429, message: `Trop de tentatives. Réessayez dans ${attempt.retryAfterSec}s.` })
    }

    const secretBytes = crypto.getRandomValues(new Uint8Array(20))
    const secret = encodeBase32(secretBytes)
    const otpauthUrl = createTOTPKeyURI('AirGap', session.email, secretBytes, 30, 6)
    const qrCode = await QRCode.toDataURL(otpauthUrl)

    const [updated] = await updateUserTwoFactor(session.id, false, secret)

    if (updated) {
        await updateUserSession(event, { sessionVersion: updated.sessionVersion })
    }

    return { qrCode, secret }
})