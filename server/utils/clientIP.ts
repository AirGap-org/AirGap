import type { H3Event } from 'h3'
import { getRequestHeader, getRequestIP } from 'h3'
import { isIP } from 'node:net'
import { useRuntimeConfig } from '#imports'
import { isCloudflareIP, isIPInCidrs } from './cloudflareIP'

const getTrustedProxyCidrs = (): string[] =>
    (process.env.TRUSTED_PROXY_CIDRS || '')
        .split(',')
        .map((cidr) => cidr.trim())
        .filter(Boolean)

/**
 * Récupère l'IP client de manière sécurisée.
 *
 * - Derrière Cloudflare ou un proxy privé de confiance, CF-Connecting-IP n'est
 *   utilisé que si la connexion TCP vient d'une IP de confiance. Un client
 *   direct ne peut donc pas forger cet en-tête pour contourner le rate-limit.
 * - X-Forwarded-For n'est lu que si TRUST_PROXY_HEADERS=true, pour un reverse
 *   proxy de confiance qui strip l'en-tête entrant.
 */
export const resolveProxiedClientIP = (
    socketIP: string | undefined,
    cfConnectingIP: string | undefined,
    trustedProxyCidrs: string[] = []
): string | undefined => {
    const candidate = cfConnectingIP?.trim()

    if (!candidate || !isIP(candidate)) return undefined
    if (!isCloudflareIP(socketIP) && !isIPInCidrs(socketIP, trustedProxyCidrs)) {
        return undefined
    }

    return candidate
}

export const getClientIP = (event: H3Event): string => {
    const config = useRuntimeConfig()
    const trustProxy = config.trustProxyHeaders === true || process.env.TRUST_PROXY_HEADERS === 'true'
    const socketIP = getRequestIP(event, { xForwardedFor: false })
    const proxiedIP = resolveProxiedClientIP(
        socketIP,
        getRequestHeader(event, 'cf-connecting-ip'),
        getTrustedProxyCidrs()
    )

    if (proxiedIP) return proxiedIP

    return getRequestIP(event, { xForwardedFor: trustProxy }) || socketIP || 'unknown'
}
