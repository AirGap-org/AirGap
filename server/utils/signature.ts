import crypto from 'node:crypto'

const KEY = process.env.ENCRYPTION_KEY || ''

if (!KEY) {
    throw new Error('ENCRYPTION_KEY est requis pour calculer les signatures de transaction.')
}

/**
 * Signature stable utilisée pour dédupliquer les imports CSV sans déchiffrer
 * tout l'historique : date (jour), montant absolu et libellé normalisé.
 */
export const transactionSignature = (date: Date | string, amount: number | string, description: string): string => {
    const day = new Date(date).toISOString().slice(0, 10)
    const normalizedAmount = Math.abs(Number(amount))
    const normalizedDescription = description.trim().toLowerCase()

    return crypto
        .createHmac('sha256', KEY)
        .update(`${day}|${normalizedAmount}|${normalizedDescription}`)
        .digest('hex')
}
