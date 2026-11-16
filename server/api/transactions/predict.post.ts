import { z } from 'zod'
import { requireAuth } from '#server/utils/auth'
import { checkRateLimit, consumeRateLimitAttempt } from '#server/utils/rateLimit'

const predictSchema = z.object({
    libelle: z.string().trim().min(1, 'Libellé requis').max(200, 'Libellé trop long'),
    montant: z.number().finite('Montant invalide')
})

const AI_TIMEOUT_MS = 5_000
const AI_MAX_RESPONSE_BYTES = 20_000

const getAiPredictUrl = () => {
    const config = useRuntimeConfig()
    return config.ai?.predictUrl || process.env.AIRGAP_AI_PREDICT_URL || 'https://airgap-ai.aldwin-weber.fr/predire'
}

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const body = await readValidatedBody(event, (payload) => predictSchema.safeParse(payload))

    if (!body.success) {
        throw createError({
            statusCode: 400,
            message: body.error.issues[0]?.message || 'Données invalides'
        })
    }

    const rl = await checkRateLimit('ai-predict', user.id)
    if (!rl.allowed) {
        throw createError({
            statusCode: 429,
            message: `Trop de prédictions. Réessayez dans ${rl.retryAfterSec}s.`
        })
    }

    const attempt = await consumeRateLimitAttempt('ai-predict', user.id, 30)
    if (!attempt.allowed) {
        throw createError({
            statusCode: 429,
            message: `Trop de prédictions. Réessayez dans ${attempt.retryAfterSec}s.`
        })
    }

    try {
        const response = await fetch(getAiPredictUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(body.data),
            signal: AbortSignal.timeout(AI_TIMEOUT_MS)
        })

        const text = await response.text()

        if (text.length > AI_MAX_RESPONSE_BYTES) {
            throw new Error('Réponse du service IA trop volumineuse')
        }

        if (!response.ok) {
            throw new Error(`AI service error (${response.status})`)
        }

        try {
            return text ? JSON.parse(text) : {}
        } catch {
            return { raw: text }
        }
    } catch (error) {
        console.error('Erreur lors de la prédiction IA:', error)
        throw createError({
            statusCode: 502,
            message: 'Erreur lors de la prédiction.'
        })
    }
})
