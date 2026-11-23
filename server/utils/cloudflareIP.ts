import { isIP } from 'node:net'

type IpVersion = 4 | 6

type CidrRange = {
    version: IpVersion
    network: bigint
    mask: bigint
}

// Source : https://www.cloudflare.com/ips-v4 et https://www.cloudflare.com/ips-v6
const CLOUDFLARE_CIDRS = [
    '173.245.48.0/20',
    '103.21.244.0/22',
    '103.22.200.0/22',
    '103.31.4.0/22',
    '141.101.64.0/18',
    '108.162.192.0/18',
    '190.93.240.0/20',
    '188.114.96.0/20',
    '197.234.240.0/22',
    '198.41.128.0/17',
    '162.158.0.0/15',
    '104.16.0.0/13',
    '104.24.0.0/14',
    '172.64.0.0/13',
    '131.0.72.0/22',
    '2400:cb00::/32',
    '2606:4700::/32',
    '2803:f800::/32',
    '2405:b500::/32',
    '2405:8100::/32',
    '2a06:98c0::/29',
    '2c0f:f248::/32'
]

const parseIPv4 = (ip: string): bigint => {
    const parts = ip.split('.').map(Number)
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
        throw new Error('IPv4 invalide')
    }

    return (BigInt(parts[0]!) << 24n)
        | (BigInt(parts[1]!) << 16n)
        | (BigInt(parts[2]!) << 8n)
        | BigInt(parts[3]!)
}

const parseIPv6 = (ip: string): bigint => {
    let normalized = ip

    if (normalized.includes('.')) {
        const lastColon = normalized.lastIndexOf(':')
        const ipv4 = parseIPv4(normalized.slice(lastColon + 1))
        const high = (ipv4 >> 16n) & 0xffffn
        const low = ipv4 & 0xffffn
        normalized = `${normalized.slice(0, lastColon + 1)}${high.toString(16)}:${low.toString(16)}`
    }

    const [head, tail] = normalized.split('::')
    const headParts = head ? head.split(':') : []
    const tailParts = tail ? tail.split(':') : []
    const missing = 8 - headParts.length - tailParts.length

    if (missing < 0) {
        throw new Error('IPv6 invalide')
    }

    const parts = [
        ...headParts,
        ...Array.from({ length: missing }, () => '0'),
        ...tailParts
    ]

    return parts.reduce((value, part) => {
        const parsed = Number.parseInt(part || '0', 16)
        if (!Number.isInteger(parsed) || parsed < 0 || parsed > 0xffff) {
            throw new Error('IPv6 invalide')
        }
        return (value << 16n) + BigInt(parsed)
    }, 0n)
}

const toCidrRange = (cidr: string): CidrRange => {
    const [ip, prefixRaw] = cidr.split('/')

    if (!ip || prefixRaw === undefined) {
        throw new Error(`CIDR invalide: ${cidr}`)
    }

    const version = isIP(ip) as IpVersion | 0
    const prefix = Number(prefixRaw)

    if ((version !== 4 && version !== 6) || !Number.isInteger(prefix)) {
        throw new Error(`CIDR invalide: ${cidr}`)
    }

    const bits = version === 4 ? 32 : 128
    if (prefix < 0 || prefix > bits) {
        throw new Error(`Préfixe CIDR invalide: ${cidr}`)
    }

    const network = version === 4 ? parseIPv4(ip) : parseIPv6(ip)
    const mask = prefix === 0 ? 0n : (((1n << BigInt(prefix)) - 1n) << BigInt(bits - prefix))

    return {
        version,
        network: network & mask,
        mask
    }
}

const CLOUDFLARE_RANGES = CLOUDFLARE_CIDRS.map(toCidrRange)

const normalizeMappedIPv4 = (ip: string): string => {
    const match = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i)
    return match?.[1] ?? ip
}

const matchesRanges = (ip: string, ranges: CidrRange[]): boolean => {
    const candidate = normalizeMappedIPv4(ip.trim())
    const version = isIP(candidate) as IpVersion | 0

    if (version !== 4 && version !== 6) return false

    let value: bigint
    try {
        value = version === 4 ? parseIPv4(candidate) : parseIPv6(candidate)
    } catch {
        return false
    }

    return ranges.some((range) =>
        range.version === version && (value & range.mask) === range.network
    )
}

/**
 * Indique si une IP appartient à une liste de CIDR.
 */
export const isIPInCidrs = (ip: string | null | undefined, cidrs: string[]): boolean => {
    if (!ip || cidrs.length === 0) return false

    const ranges: CidrRange[] = []
    for (const cidr of cidrs) {
        try {
            ranges.push(toCidrRange(cidr))
        } catch {
            // Ignore une entrée de configuration invalide.
        }
    }

    return matchesRanges(ip, ranges)
}

/**
 * Indique si une IP appartient aux plages d'origine Cloudflare.
 */
export const isCloudflareIP = (ip: string | null | undefined): boolean =>
    Boolean(ip) && matchesRanges(ip!, CLOUDFLARE_RANGES)
