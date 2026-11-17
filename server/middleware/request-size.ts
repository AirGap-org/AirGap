const MAX_BODY_BYTES = 5 * 1024 * 1024

export default defineEventHandler((event) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(event.method)) return

    const contentLength = getRequestHeader(event, 'content-length')

    if (!contentLength) return

    const length = Number(contentLength)

    if (!Number.isFinite(length) || length < 0) {
        throw createError({ statusCode: 400, message: 'Content-Length invalide' })
    }

    if (length > MAX_BODY_BYTES) {
        throw createError({ statusCode: 413, message: 'Corps de requête trop volumineux' })
    }
})
