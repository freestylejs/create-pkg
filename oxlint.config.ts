import { defineConfig } from 'oxlint'
import { oxlintConfig } from '@freestylejs/config/oxlint'

export default defineConfig({
    ...oxlintConfig,
    ignorePatterns: [...oxlintConfig.ignorePatterns, '**/templates/**'],
    overrides: [
        ...(oxlintConfig.overrides ?? []),
        {
            files: ['src/**/*.ts'],
            rules: {
                'no-console': 'off',
            },
        },
    ],
})
