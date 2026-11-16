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
