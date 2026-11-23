import { z } from 'zod'
import { ACCOUNT_TYPES } from '~~/shared/accountTypes'
import { updateAccount } from '#server/services/accounts.service'
import { requireAuth } from '#server/utils/auth'

const paramsSchema = z.object({ id: z.string().uuid() })
const schema = z.object({
    accountName: z.string().trim().min(1).max(255).optional(),
    accountType: z.enum(ACCOUNT_TYPES).optional(),
    accountTypeLabel: z.string().trim().max(255).optional().nullable(),
    isArchived: z.boolean().optional()
}).strict().superRefine((data, ctx) => {
    if (data.accountType === 'autre' && data.accountTypeLabel !== undefined && !data.accountTypeLabel?.trim()) {
        ctx.addIssue({
            code: 'custom',
            path: ['accountTypeLabel'],
            message: 'Le libellé du type de compte est requis'
        })
    }
})

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const params = await getValidatedRouterParams(event, (value) => paramsSchema.safeParse(value))

    if (!params.success) {
        throw createError({ statusCode: 400, message: 'ID de compte invalide' })
    }

    const body = await readValidatedBody(event, (value) => schema.safeParse(value))

    if (!body.success) {
        throw createError({ statusCode: 400, message: body.error.issues[0]?.message })
    }

    if (Object.keys(body.data).length === 0) {
        return { success: true, message: 'Aucune modification demandée' }
    }

    const account = await updateAccount(user.id, params.data.id, body.data)

    if (!account) {
        throw createError({ statusCode: 404, message: 'Compte introuvable' })
    }

    return { success: true, account }
})
