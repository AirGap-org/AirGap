import { requireAuth } from '#server/utils/auth'
import { getDashboard } from '#server/services/dashboard.service'

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)

    return {
        success: true,
        ...await getDashboard(user.id)
    }
})
