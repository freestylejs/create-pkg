import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        exclude: ['templates/**', 'node_modules/**'],
        coverage: {
            provider: 'v8',
            reporter: ['html', 'text'],
            thresholds: {
                statements: 70,
                branches: 55,
                functions: 75,
                lines: 70,
            },
        },
    },
})
