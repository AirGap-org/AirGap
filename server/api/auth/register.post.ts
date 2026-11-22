import { z } from 'zod'
import { registerUser } from '#server/services/auth.service'
import { checkRateLimit, consumeRateLimitAttempt, resetRateLimit } from '#server/utils/rateLimit'
import { getClientIP } from '#server/utils/clientIP'
import { establishUserSession } from '#server/utils/auth'

const registerSchema = z.object({
    email: z.string().trim().toLowerCase().email().max(255),
    password: z.string().min(8, 'Le mot de passe doit faire au moins 8 caractères').max(72, 'Le mot de passe ne peut pas dépasser 72 caractères'),
    name: z.string().trim().min(2).max(255)
})

export default defineEventHandler(async (event) => {
    const clientIP = getClientIP(event)

    const rl = await checkRateLimit('register', clientIP)
    if (!rl.allowed) {
        throw createError({statusCode: 429, message: `Trop de tentatives. Réessayez dans ${rl.retryAfterSec}s.`})
    }

    const result = await readValidatedBody(event, body => registerSchema.safeParse(body))

    if (!result.success) {
        throw createError({ statusCode: 400, message: result.error.issues[0]?.message })
    }

    const newUser = await registerUser({
        email: result.data.email,
        password: result.data.password,
        name: result.data.name
    })

    if (!newUser) {
        await consumeRateLimitAttempt('register', clientIP)
        throw createError({ statusCode: 400, message: 'Cet email est déjà utilisé' })
    }

    await resetRateLimit('register', clientIP)

    await establishUserSession(event, {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        authProvider: newUser.authProvider ?? 'local',
        twoFactorEnabled: newUser.twoFactorEnabled ?? false,
        sessionVersion: newUser.sessionVersion
    })

    const { sessionVersion: _sessionVersion, ...publicUser } = newUser

    return { success: true, user: publicUser }
})
