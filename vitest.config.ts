import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        setupFiles: ['tests/setup.ts'],
        fileParallelism: false,
        testTimeout: 120_000,
        hookTimeout: 180_000,
        sequence: {
            concurrent: false
        }
    },
    resolve: {
        alias: {
            '#server': fileURLToPath(new URL('./server', import.meta.url)),
            '#imports': fileURLToPath(new URL('./tests/mocks/imports.ts', import.meta.url)),
            '~~': fileURLToPath(new URL('.', import.meta.url))
        }
    }
})
