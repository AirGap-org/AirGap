import { Pool } from 'pg'
import { decryptText, encryptText } from '../server/utils/crypto'

/**
 * Ré-encrypte les données v1 vers le format v2.
 * Idempotent : les valeurs déjà en v2 sont ignorées.
 *
 * Usage :
 *   NUXT_DATABASE_URL="postgresql://..." npm run db:reencrypt
 */

const connectionString = process.env.NUXT_DATABASE_URL

if (!connectionString) {
    throw new Error('NUXT_DATABASE_URL est requis pour ré-encrypter les données.')
}

const pool = new Pool({ connectionString })

const isCorrupted = (value: string) => value === 'Donnée protégée' || value === 'Donnée corrompue'

const run = async () => {
    let transactionsUpdated = 0
    let secretsUpdated = 0

    const transactions = await pool.query<{ id: string; description: string | null }>(
        'SELECT id, description FROM transactions WHERE description IS NOT NULL'
    )

    for (const row of transactions.rows) {
        if (!row.description || row.description.startsWith('v2:')) continue

        const plain = decryptText(row.description)
        if (isCorrupted(plain)) {
            console.warn(`Transaction ${row.id} ignorée : données illisibles.`)
            continue
        }

        await pool.query('UPDATE transactions SET description = $1 WHERE id = $2', [
            encryptText(plain),
            row.id
        ])
        transactionsUpdated++
    }

    const users = await pool.query<{ id: string; two_factor_secret: string | null }>(
        'SELECT id, two_factor_secret FROM users WHERE two_factor_secret IS NOT NULL'
    )

    for (const row of users.rows) {
        if (!row.two_factor_secret || row.two_factor_secret.startsWith('v2:')) continue

        const plain = decryptText(row.two_factor_secret)
        if (isCorrupted(plain)) {
            console.warn(`Secret 2FA de l'utilisateur ${row.id} ignoré : données illisibles.`)
            continue
        }

        await pool.query('UPDATE users SET two_factor_secret = $1 WHERE id = $2', [
            encryptText(plain),
            row.id
        ])
        secretsUpdated++
    }

    console.log(`${transactionsUpdated} transaction(s) et ${secretsUpdated} secret(s) 2FA migrés en v2.`)
}

run()
    .catch((error) => {
        console.error('Échec de la ré-encryption :', error)
        process.exitCode = 1
    })
    .finally(async () => {
        await pool.end()
    })
