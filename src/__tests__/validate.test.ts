import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
    deriveRepoUrl,
    ensureEmptyTarget,
    normalizeScope,
    resolveOptions,
    sanitizePackageDir,
    validateProjectName,
} from '../validate.ts'

const dirs: string[] = []

afterEach(() => {
    for (const dir of dirs.splice(0))
        rmSync(dir, { recursive: true, force: true })
})

describe('generator validation', () => {
    it('normalizes scopes and derives repository URLs', () => {
        expect(normalizeScope('acme')).toBe('@acme')
        expect(normalizeScope('@acme')).toBe('@acme')
        expect(deriveRepoUrl('@acme', 'my-lib')).toBe(
            'https://github.com/acme/my-lib'
        )
        expect(
            deriveRepoUrl('@acme', 'my-lib', 'https://example.com/repo/')
        ).toBe('https://example.com/repo')
    })

    it('sanitizes package directories and validates project names', () => {
        expect(sanitizePackageDir('@acme/My Lib')).toBe('my-lib')
        expect(validateProjectName('my-lib')).toBeUndefined()
        expect(validateProjectName('../escape')).toContain('path separators')
        expect(validateProjectName('')).toContain('required')
    })

    it('derives a package name from the package scope', () => {
        const options = resolveOptions({
            targetDir: '/tmp/fixture',
            packageName: '@acme/my-lib',
            yes: true,
            install: false,
            git: false,
            verify: false,
        })

        expect(options.packageName).toBe('@acme/my-lib')
        expect(options.packageDir).toBe('my-lib')
        expect(options.repoUrl).toBe('https://github.com/acme/fixture')
        expect(options.privatePackage).toBe(true)
    })

    it('rejects a non-empty target unless forced', () => {
        const root = mkdtempSync(join(tmpdir(), 'create-pkg-target-'))
        dirs.push(root)
        mkdirSync(join(root, 'occupied'), { recursive: true })
        writeFileSync(join(root, 'occupied', 'file.txt'), 'x')
        expect(() => ensureEmptyTarget(join(root, 'occupied'), false)).toThrow(
            'not empty'
        )
        expect(() =>
            ensureEmptyTarget(join(root, 'occupied'), true)
        ).not.toThrow()
    })
})
