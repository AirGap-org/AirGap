import { sql } from 'drizzle-orm'
import { db } from '#server/db'

export default defineEventHandler(async () => {
    try {
        await db.execute(sql`SELECT 1`)
        return { status: 'ok' }
    } catch {
        throw createError({
            statusCode: 503,
            statusMessage: 'Service indisponible'
        })
    }
})
