import {getUserTransactionsByYear} from "#server/services/calendar.service";

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event)

    const {year, month, quarter} = getQuery(event)

    const parsedYear = Number(year)
    const parsedMonth = month === undefined ? undefined : Number(month)
    const parsedQuarter = quarter === undefined ? undefined : Number(quarter)

    if (!Number.isInteger(parsedYear) || parsedYear < 1970 || parsedYear > 2100) {
        throw createError({ statusCode: 400, message: 'Année invalide' })
    }

    if (parsedMonth !== undefined && (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12)) {
        throw createError({ statusCode: 400, message: 'Mois invalide' })
    }

    if (parsedQuarter !== undefined && (!Number.isInteger(parsedQuarter) || parsedQuarter < 1 || parsedQuarter > 4)) {
        throw createError({ statusCode: 400, message: 'Trimestre invalide' })
    }

    try {
        const result = await getUserTransactionsByYear(user.id, parsedYear, parsedMonth, parsedQuarter);

        return {
            success: true,
            initialBalance: result.initialBalance,
            transactions: result.transactions
        }
    } catch (error) {
        console.error('Erreur récupération transactions:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Impossible de récupérer vos transactions pour cette année'
        })
    }
})