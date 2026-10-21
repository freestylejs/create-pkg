import { existsSync, readdirSync, statSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import validatePackageName from 'validate-npm-package-name'
import type { CliFlags, CreateOptions, TemplateName } from './types.ts'
import { TEMPLATES } from './types.ts'

const DEFAULT_SCOPE = '@freestylejs'

export function sanitizePackageDir(name: string): string {
    const unscoped = name.startsWith('@')
        ? name.slice(name.indexOf('/') + 1)
        : name
    return unscoped
        .toLowerCase()
        .replaceAll(/[^a-z0-9._-]+/g, '-')
        .replaceAll(/^[-._]+|[-._]+$/g, '')
}

export function validateProjectName(name: string): string | undefined {
    if (!name || name === '.' || name === '..')
        return 'Project name is required'
    if (name.includes('/') || name.includes('\\'))
        return 'Project name cannot contain path separators'
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name)) {
        return 'Project name must start with a letter or number and use only letters, numbers, dots, dashes, or underscores'
    }
    return undefined
}

export function validatePackageNameOrThrow(name: string): void {
    const result = validatePackageName(name)
    if (!result.validForNewPackages) {
        throw new Error(
            `Invalid package name "${name}": ${[...(result.errors ?? []), ...(result.warnings ?? [])].join(', ')}`
        )
    }
}

export function normalizeScope(scope: string | undefined): string {
    if (!scope) return DEFAULT_SCOPE
    return scope.startsWith('@') ? scope : `@${scope}`
}

export function derivePackageName(
    projectName: string,
    scope: string,
    explicit?: string
): string {
    if (explicit) return explicit
    return `${scope}/${projectName}`
}

export function deriveRepoUrl(
    scope: string,
    projectName: string,
    explicit?: string
): string {
    if (explicit) return explicit.replace(/\/+$/, '')
    const owner = scope.startsWith('@') ? scope.slice(1) : scope
    return `https://github.com/${owner || 'freestylejs'}/${projectName}`
}

export function ensureEmptyTarget(target: string, force: boolean): void {
    if (!existsSync(target)) return
    const stat = statSync(target)
    if (!stat.isDirectory()) {
        throw new Error(`Target exists and is not a directory: ${target}`)
    }
    if (readdirSync(target).length > 0 && !force) {
        throw new Error(
            `Target directory is not empty: ${target}. Use --force to replace it.`
        )
    }
}

export function resolveOptions(
    flags: CliFlags,
    prompted: Partial<CreateOptions> = {}
): CreateOptions {
    const target = resolve(flags.targetDir ?? prompted.targetDir ?? '.')
    const projectName = prompted.projectName ?? basename(target)
    const explicitPackageName = flags.packageName ?? prompted.packageName
    const scope = normalizeScope(
        flags.scope ??
            (explicitPackageName?.startsWith('@')
                ? explicitPackageName.slice(0, explicitPackageName.indexOf('/'))
                : undefined)
    )
    const packageName = derivePackageName(
        projectName,
        scope,
        explicitPackageName
    )
    const packageDir = sanitizePackageDir(packageName)
    const corePackageName = scope ? `${scope}/core` : 'core'
    const cliBin = packageDir
    const description =
        flags.description ?? prompted.description ?? `${projectName} package`
    const author = flags.author ?? prompted.author ?? 'freestyle'
    const license = flags.license ?? prompted.license ?? 'MIT'
    const privatePackage =
        flags.privatePackage ??
        (flags.publicPackage ? false : (prompted.privatePackage ?? true))
    const install = flags.install ?? prompted.install ?? true
    const git = flags.git ?? prompted.git ?? true
    const verify = flags.verify ?? prompted.verify ?? install
    const template = flags.template ?? prompted.template ?? 'library'
    const repoUrl = deriveRepoUrl(
        scope,
        projectName,
        flags.repoUrl ?? prompted.repoUrl
    )

    const projectError = validateProjectName(projectName)
    if (projectError) throw new Error(projectError)
    validatePackageNameOrThrow(packageName)
    if (!TEMPLATES.includes(template as TemplateName)) {
        throw new Error(`Unknown template: ${template}`)
    }

    return {
        targetDir: target,
        projectName,
        packageName,
        packageDir,
        corePackageName,
        cliBin,
        template,
        description,
        author,
        license,
        privatePackage,
        install,
        git,
        verify,
        force: flags.force ?? false,
        repoUrl,
    }
}

export function createContext(
    options: CreateOptions
): CreateOptions & { year: string } {
    return {
        ...options,
        year: String(new Date().getFullYear()),
    }
}
