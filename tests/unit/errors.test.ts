import { describe, expect, it } from 'vitest'
import { createError } from 'h3'
import { getErrorCode, getErrorMessage, getErrorStatusCode, isHttpError, rethrowIfHttpError } from '#server/utils/errors'

describe('errors helpers', () => {
    it('extrait un statusCode H3', () => {
        const error = createError({ statusCode: 404, message: 'introuvable' })

        expect(getErrorStatusCode(error)).toBe(404)
        expect(isHttpError(error)).toBe(true)
    })

    it('ne considère pas une erreur métier comme HTTP', () => {
        expect(isHttpError(new Error('boom'))).toBe(false)
    })

    it('relance les erreurs HTTP telles quelles', () => {
        const error = createError({ statusCode: 403, message: 'interdit' })

        expect(() => rethrowIfHttpError(error)).toThrow(error)
    })

    it('lit code et message avec repli', () => {
        expect(getErrorCode({ code: '23505' })).toBe('23505')
        expect(getErrorMessage({}, 'repli')).toBe('repli')
    })
})
