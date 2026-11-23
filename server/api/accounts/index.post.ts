import { z } from 'zod'
import { ACCOUNT_TYPES } from '~~/shared/accountTypes'
import { createAccount } from '#server/services/accounts.service'
import { requireAuth } from '#server/utils/auth'

const schema = z.object({
    accountName: z.string().trim().min(1, 'Le nom est requis').max(255),
    accountType: z.enum(ACCOUNT_TYPES),
    accountTypeLabel: z.string().trim().max(255).optional().nullable(),
    openingBalance: z.number().finite().min(-1_000_000_000_000).max(1_000_000_000_000).optional()
}).superRefine((data, ctx) => {
    if (data.accountType === 'autre' && !data.accountTypeLabel?.trim()) {
        ctx.addIssue({
            code: 'custom',
            path: ['accountTypeLabel'],
            message: 'Le libellé du type de compte est requis'
        })
    }
})

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)
    const body = await readValidatedBody(event, (value) => schema.safeParse(value))

    if (!body.success) {
        throw createError({ statusCode: 400, message: body.error.issues[0]?.message })
    }

    const account = await createAccount(user.id, body.data)

    return { success: true, account }
})
