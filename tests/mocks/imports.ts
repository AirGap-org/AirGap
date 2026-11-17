export const useRuntimeConfig = () => ({
    databaseUrl: process.env.NUXT_DATABASE_URL || '',
    appSecret: process.env.NUXT_APP_SECRET || '',
    trustProxyHeaders: false,
    rateLimit: {
        maxAttempts: 5,
        lockoutMinutes: 15
    },
    ai: {
        predictUrl: 'http://127.0.0.1:1'
    }
})
