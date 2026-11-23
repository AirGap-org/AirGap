export const ACCOUNT_TYPES = [
    'courant',
    'livret_a',
    'livret_jeune',
    'ldds',
    'lep',
    'pel',
    'cel',
    'pea',
    'cto',
    'assurance_vie',
    'crypto',
    'autre'
] as const

export type AccountType = (typeof ACCOUNT_TYPES)[number]

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
    courant: 'Compte courant',
    livret_a: 'Livret A',
    livret_jeune: 'Livret Jeune',
    ldds: 'LDDS',
    lep: 'LEP',
    pel: 'PEL',
    cel: 'CEL',
    pea: 'PEA',
    cto: 'Compte-titres',
    assurance_vie: 'Assurance vie',
    crypto: 'Crypto',
    autre: 'Autre'
}

export const getAccountTypeLabel = (type: string, customLabel?: string | null): string => {
    if (type === 'autre') {
        return customLabel?.trim() || 'Autre'
    }

    return ACCOUNT_TYPE_LABELS[type as AccountType] || type
}
