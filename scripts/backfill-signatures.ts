import { Pool } from 'pg'
import { decryptText } from '../server/utils/crypto'
import { transactionSignature } from '../server/utils/signature'

/**
 * Calcule les signatures d'import manquantes sur les transactions existantes.
 * Idempotent : les lignes déjà signées sont ignorées.
 *
 * Usage :
 *   NUXT_DATABASE_URL="postgresql://..." npm run db:backfill-signatures
 */

const connectionString = process.env.NUXT_DATABASE_URL

if (!connectionString) {
    throw new Error('NUXT_DATABASE_URL est requis.')
}

const pool = new Pool({ connectionString })

const isCorrupted = (value: string) => value === 'Donnée protégée' || value === 'Donnée corrompue'

const run = async () => {
    const { rows } = await pool.query<{
        id: string
        userId: string
        date: Date
        amount: string
        description: string | null
    }>('SELECT id, "userId", date, amount, description FROM transactions WHERE import_signature IS NULL')

    const seen = new Set<string>()
    let updated = 0
    let skipped = 0

    for (const row of rows) {
        const description = decryptText(row.description || '')

        if (!description || isCorrupted(description)) {
            skipped++
            continue
        }

        const signature = transactionSignature(row.date, row.amount, description)

        if (seen.has(signature)) {
            skipped++
            continue
        }

        seen.add(signature)

        await pool.query('UPDATE transactions SET import_signature = $1 WHERE id = $2', [signature, row.id])
        updated++
    }

    console.log(`${updated} signature(s) calculée(s), ${skipped} ligne(s) ignorée(s).`)
}

run()
    .catch((error) => {
        console.error('Échec du backfill des signatures :', error)
        process.exitCode = 1
    })
    .finally(async () => {
        await pool.end()
    })
