import { z } from 'zod'
import { getAccountWithBalance } from '#server/services/accounts.service'
import { requireAuth } from '#server/utils/auth'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const params = await getValidatedRouterParams(event, (value) => paramsSchema.safeParse(value))

    if (!params.success) {
        throw createError({ statusCode: 400, message: 'ID de compte invalide' })
    }

    const account = await getAccountWithBalance(user.id, params.data.id)

    if (!account) {
        throw createError({ statusCode: 404, message: 'Compte introuvable' })
    }

    return { success: true, account }
})
