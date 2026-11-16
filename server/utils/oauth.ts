import type { H3Event } from 'h3'
import type { RequestEvent } from 'nuxt/server'
import { establishUserSession } from '#server/utils/auth'

type OAuthEvent = H3Event | RequestEvent

type OAuthUser = {
    id: string
    email: string
    name?: string | null
    authProvider: string
    twoFactorEnabled: boolean
}

/**
 * sendRedirect attend un H3Event historique alors que nuxt-auth-utils expose
 * désormais un RequestEvent dans les handlers OAuth.
 */
export const redirectOAuth = (event: OAuthEvent, location: string) =>
    sendRedirect(event as unknown as H3Event, location)

export const establishOAuthSession = async (event: OAuthEvent, user: OAuthUser) => {
    await establishUserSession(event as unknown as H3Event, user)
    return redirectOAuth(event, '/')
}
