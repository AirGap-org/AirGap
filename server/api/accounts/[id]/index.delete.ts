import { z } from 'zod'
import { deleteAccount } from '#server/services/accounts.service'
import { requireAuth } from '#server/utils/auth'

const paramsSchema = z.object({ id: z.string().uuid() })

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const params = await getValidatedRouterParams(event, (value) => paramsSchema.safeParse(value))

    if (!params.success) {
        throw createError({ statusCode: 400, message: 'ID de compte invalide' })
    }

    const result = await deleteAccount(user.id, params.data.id)

    if (result.deleted) {
        return { success: true }
    }

    if (result.reason === 'not_found') {
        throw createError({ statusCode: 404, message: 'Compte introuvable' })
    }

    throw createError({
        statusCode: 409,
        message: result.reason === 'transactions'
            ? 'Impossible de supprimer un compte utilisé par des transactions. Archivez-le.'
            : 'Impossible de supprimer un compte utilisé par des budgets. Archivez-le.'
    })
})
