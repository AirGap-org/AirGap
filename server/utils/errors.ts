type ErrorWithDetails = {
    statusCode?: number
    code?: string
    message?: string
}

const asErrorWithDetails = (error: unknown): ErrorWithDetails =>
    typeof error === 'object' && error !== null ? error as ErrorWithDetails : {}

export const getErrorStatusCode = (error: unknown): number | undefined =>
    asErrorWithDetails(error).statusCode

export const getErrorCode = (error: unknown): string | undefined =>
    asErrorWithDetails(error).code

export const getErrorMessage = (error: unknown, fallback: string): string =>
    asErrorWithDetails(error).message || fallback

/** Une erreur HTTP explicite (404, 403, 409...) ne doit pas être masquée en 500. */
export const isHttpError = (error: unknown): boolean =>
    getErrorStatusCode(error) !== undefined

export const rethrowIfHttpError = (error: unknown): void => {
    if (isHttpError(error)) throw error
}
