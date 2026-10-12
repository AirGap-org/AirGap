import {getUserTransactions} from "#server/services/transactions.service";
import { H3Event, EventHandlerRequest } from "h3";

export default defineEventHandler(async (event: H3Event<EventHandlerRequest>) => {
    const user = await requireAuth(event)

    try {
        const transactions = await getUserTransactions(user.id)

        return {
            success: true,
            count: transactions.length,
            transactions: transactions
        }
    } catch (error) {
        console.error('Erreur récupération transactions:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Impossible de récupérer vos transactions'
        })
    }
})