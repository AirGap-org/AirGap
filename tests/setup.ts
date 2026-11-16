// Clés déterministes : les tests ne doivent jamais dépendre du .env local.
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef'
process.env.NUXT_APP_SECRET = 'fedcba9876543210fedcba9876543210'
process.env.NUXT_DATABASE_URL ||= 'postgresql://airgap:airgap123@localhost:5432/airgap_test'

const { createError } = await import('h3')
const { encryptText, decryptText } = await import('../server/utils/crypto')

Object.assign(globalThis, {
    createError,
    encryptText,
    decryptText
})
