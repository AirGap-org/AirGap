import { Pool } from 'pg'

/**
 * Préflight avant la migration d'unicité insensible à la casse.
 * Échoue si plusieurs comptes partagent le même email au casing près.
 *
 * Usage :
 *   NUXT_DATABASE_URL="postgresql://..." npm run db:check-emails
 */

const connectionString = process.env.NUXT_DATABASE_URL

if (!connectionString) {
    throw new Error('NUXT_DATABASE_URL est requis.')
}

const pool = new Pool({ connectionString })

const run = async () => {
    const { rows } = await pool.query<{ email: string; count: number }>(`
        SELECT lower(email) AS email, count(*)::int AS count
        FROM users
        GROUP BY lower(email)
        HAVING count(*) > 1
        ORDER BY lower(email)
    `)

    if (rows.length > 0) {
        console.error('Emails en doublon (casse ignorée) :')
        for (const row of rows) {
            console.error(`- ${row.email} (${row.count} comptes)`)
        }
        console.error('Fusionnez ou renommez ces comptes avant de déployer la migration.')
        process.exitCode = 1
        return
    }

    console.log('Aucun doublon d’email détecté.')
}

run()
    .catch((error) => {
        console.error('Échec de la vérification :', error)
        process.exitCode = 1
    })
    .finally(async () => {
        await pool.end()
    })
