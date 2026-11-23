import { useRuntimeConfig } from '#imports'

const isConfigured = (clientId?: string, clientSecret?: string): boolean =>
    Boolean(
        clientId
        && clientSecret
        && !/^xxx/i.test(clientId)
        && !/^xxx/i.test(clientSecret)
    )

export default defineEventHandler(() => {
    const config = useRuntimeConfig()

    return {
        google: isConfigured(config.oauth?.google?.clientId, config.oauth?.google?.clientSecret),
        github: isConfigured(config.oauth?.github?.clientId, config.oauth?.github?.clientSecret)
    }
})
