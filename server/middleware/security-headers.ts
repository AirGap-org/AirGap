const getAiOrigin = (): string => {
    const url = process.env.AIRGAP_AI_PREDICT_URL || 'https://airgap-ai.aldwin-weber.fr/predire'

    try {
        return new URL(url).origin
    } catch {
        return ''
    }
}

const buildContentSecurityPolicy = (): string => {
    const isDev = process.env.NODE_ENV !== 'production'
    const aiOrigin = getAiOrigin()

    const connectSrc = ["'self'", aiOrigin, isDev ? 'ws: http:' : ''].filter(Boolean).join(' ')

    return [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "style-src 'self' 'unsafe-inline'",
        "script-src 'self' 'unsafe-inline'",
        `connect-src ${connectSrc}`,
        "worker-src 'self' blob:",
        "manifest-src 'self'"
    ].join('; ')
}

const CSP = buildContentSecurityPolicy()

export default defineEventHandler((event) => {
    const pathname = event.path.split('?')[0] ?? event.path

    setHeader(event, 'X-Content-Type-Options', 'nosniff')
    setHeader(event, 'X-Frame-Options', 'DENY')
    setHeader(event, 'Referrer-Policy', 'strict-origin-when-cross-origin')
    setHeader(event, 'Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
    setHeader(event, 'Cross-Origin-Opener-Policy', 'same-origin')
    setHeader(event, 'Cross-Origin-Resource-Policy', 'same-origin')
    setHeader(event, 'Content-Security-Policy', CSP)

    if (process.env.NODE_ENV === 'production') {
        setHeader(event, 'Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }

    if (pathname.startsWith('/api')) {
        setHeader(event, 'Cache-Control', 'no-store')
        setHeader(event, 'Pragma', 'no-cache')
        setHeader(event, 'Vary', 'Cookie')
    }
})
