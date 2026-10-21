import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { toolchain } from '@freestylejs/config/toolchain'
import { scaffold } from '../scaffold.ts'
import { sanitizePackageDir, validatePackageNameOrThrow } from '../validate.ts'
import type { CreateOptions, TemplateName } from '../types.ts'

const dirs: string[] = []

function makeOptions(
    template: TemplateName,
    packageDir = 'fixture'
): CreateOptions {
    const root = mkdtempSync(join(tmpdir(), 'create-pkg-test-'))
    dirs.push(root)
    return {
        targetDir: join(root, 'fixture-repo'),
        projectName: 'fixture-repo',
        packageName: `@acme/${packageDir}`,
        packageDir,
        corePackageName: '@acme/core',
        cliBin: packageDir,
        template,
        description: 'Fixture package',
        author: 'Acme',
        license: 'MIT',
        privatePackage: true,
        install: false,
        git: false,
        verify: false,
        force: false,
        repoUrl: 'https://github.com/acme/fixture-repo',
    }
}

afterEach(() => {
    for (const dir of dirs.splice(0))
        rmSync(dir, { recursive: true, force: true })
})

describe('create-pkg scaffolding', () => {
    it('validates and sanitizes package names', () => {
        expect(sanitizePackageDir('@acme/my-lib')).toBe('my-lib')
        expect(() => validatePackageNameOrThrow('@acme/my-lib')).not.toThrow()
        expect(() => validatePackageNameOrThrow('not a package')).toThrow(
            /Invalid package name/
        )
    })

    it('creates a library template with rewritten metadata', () => {
        const options = makeOptions('library')
        scaffold(options)
        const packageJson = JSON.parse(
            readFileSync(
                join(options.targetDir, 'packages/fixture/package.json'),
                'utf8'
            )
        ) as Record<string, unknown>
        const rootJson = JSON.parse(
            readFileSync(join(options.targetDir, 'package.json'), 'utf8')
        ) as Record<string, unknown>

        expect(packageJson.name).toBe('@acme/fixture')
        expect(packageJson.private).toBe(true)
        expect(rootJson.name).toBe('fixture-repo')
        expect(rootJson.repository).toMatchObject({
            url: 'git+https://github.com/acme/fixture-repo.git',
        })
        expect(rootJson.packageManager).toBe(`pnpm@${toolchain.pnpm}`)
        expect(
            (rootJson.devDependencies as Record<string, string>).tsdown
        ).toBe(toolchain.tsdown)
        expect(
            (rootJson.devDependencies as Record<string, string>)[
                '@freestylejs/config'
            ]
        ).toBe(toolchain.config)
        expect(
            readFileSync(join(options.targetDir, 'tsconfig.json'), 'utf8')
        ).toContain('./packages/fixture/src/*')
        expect(
            readFileSync(
                join(options.targetDir, '.changeset/config.json'),
                'utf8'
            )
        ).toContain('"restricted"')
    })

    it('creates a CLI template with a bin entry', () => {
        const options = makeOptions('cli', 'my-cli')
        scaffold(options)
        const packageJson = JSON.parse(
            readFileSync(
                join(options.targetDir, 'packages/my-cli/package.json'),
                'utf8'
            )
        ) as Record<string, unknown>

        expect(packageJson.bin).toEqual({ 'my-cli': './dist/cli.js' })
        expect(
            existsSync(join(options.targetDir, 'packages/my-cli/src/cli.ts'))
        ).toBe(true)
    })

    it('creates a monorepo template with a core package', () => {
        const options = makeOptions('monorepo', 'workspace')
        scaffold(options)
        const core = JSON.parse(
            readFileSync(
                join(options.targetDir, 'packages/core/package.json'),
                'utf8'
            )
        ) as Record<string, unknown>

        expect(core.name).toBe('@acme/core')
        expect(
            existsSync(
                join(options.targetDir, 'packages/workspace/package.json')
            )
        ).toBe(true)
    })

    it('does not leave template placeholders in generated files', () => {
        const options = makeOptions('library')
        scaffold(options)
        const files = [
            'README.md',
            'LICENSE',
            'package.json',
            'packages/fixture/package.json',
            'vitest.config.ts',
            'scripts/verify-package.mjs',
        ]
        for (const file of files) {
            const content = readFileSync(join(options.targetDir, file), 'utf8')
            expect(content).not.toMatch(/__[A-Z_]+__|__packageDir__/)
        }
    })
})
