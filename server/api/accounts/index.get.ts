import { getAccountsWithBalances } from '#server/services/accounts.service'
import { requireAuth } from '#server/utils/auth'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)

    return {
        success: true,
        accounts: await getAccountsWithBalances(user.id)
    }
})
