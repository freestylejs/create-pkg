import {
    copyFileSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    statSync,
    writeFileSync,
} from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { toolchainPlaceholders } from '@freestylejs/config/toolchain'
import type { TemplateContext, TemplateName } from './types.ts'

const templateRoot = fileURLToPath(new URL('../templates', import.meta.url))
const skippedDirectories = new Set([
    '.git',
    'node_modules',
    'dist',
    'coverage',
    '.turbo',
    '.trace',
])

const jsonExtensions = new Set(['.json', '.jsonc'])
const textExtensions = new Set([
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.mjs',
    '.cjs',
    '.md',
    '.yml',
    '.yaml',
    '.txt',
    '.gitignore',
    '.gitattributes',
    '.npmignore',
    '.npmrc',
    '.nvmrc',
])

function isTextFile(path: string): boolean {
    const name = basename(path)
    if (
        name === '.gitignore' ||
        name === '.gitattributes' ||
        name === '.npmignore'
    )
        return true
    if (name === '.npmrc' || name === '.nvmrc' || name === 'LICENSE')
        return true
    return [...textExtensions].some((extension) => path.endsWith(extension))
}

function renderString(value: string, context: TemplateContext): string {
    let rendered = value
        .replaceAll('__PROJECT_NAME__', context.projectName)
        .replaceAll('__PACKAGE_NAME__', context.packageName)
        .replaceAll('__PACKAGE_DIR__', context.packageDir)
        .replaceAll('__CORE_PACKAGE_NAME__', context.corePackageName)
        .replaceAll('__CLI_BIN__', context.cliBin)
        .replaceAll('__DESCRIPTION__', context.description)
        .replaceAll('__AUTHOR__', context.author)
        .replaceAll('__LICENSE__', context.license)
        .replaceAll('__REPO_URL__', context.repoUrl)
        .replaceAll('__YEAR__', context.year)

    for (const [placeholder, replacement] of Object.entries(
        toolchainPlaceholders
    )) {
        rendered = rendered.replaceAll(placeholder, replacement)
    }

    return rendered
}

function renderJson(value: unknown, context: TemplateContext): unknown {
    if (typeof value === 'string') return renderString(value, context)
    if (Array.isArray(value))
        return value.map((item) => renderJson(item, context))
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [
                key,
                renderJson(item, context),
            ])
        )
    }
    return value
}

function copyFile(
    source: string,
    destination: string,
    context: TemplateContext
): void {
    const relativeName = relative(templateRoot, source)
    if (jsonExtensions.has(relativeName.slice(relativeName.lastIndexOf('.')))) {
        const value = JSON.parse(readFileSync(source, 'utf8')) as unknown
        writeFileSync(
            destination,
            `${JSON.stringify(renderJson(value, context), null, 4)}\n`
        )
        return
    }
    if (isTextFile(source)) {
        writeFileSync(
            destination,
            renderString(readFileSync(source, 'utf8'), context)
        )
        return
    }
    copyFileSync(source, destination)
}

function copyDirectory(
    rootSource: string,
    source: string,
    destination: string,
    context: TemplateContext
): void {
    for (const entry of readdirSync(source)) {
        if (skippedDirectories.has(entry)) continue
        const sourcePath = join(source, entry)
        const relativePath = relative(rootSource, sourcePath)
        const renderedPath = relativePath
            .replaceAll('__packageDir__', context.packageDir)
            .replace(/(^|\/)(gitignore|npmignore)$/, '$1.$2')
        const destinationPath = join(destination, renderedPath)
        const stat = statSync(sourcePath)
        if (stat.isDirectory()) {
            mkdirSync(destinationPath, { recursive: true })
            copyDirectory(rootSource, sourcePath, destination, context)
        } else {
            mkdirSync(dirname(destinationPath), { recursive: true })
            copyFile(sourcePath, destinationPath, context)
        }
    }
}

export function copyTemplate(
    template: TemplateName,
    destination: string,
    context: TemplateContext
): void {
    mkdirSync(destination, { recursive: true })
    const base = join(templateRoot, '_base')
    const variant = join(templateRoot, template)
    copyDirectory(base, base, destination, context)
    copyDirectory(variant, variant, destination, context)
}

function readJson(path: string): Record<string, unknown> {
    return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
}

function writeJson(path: string, value: Record<string, unknown>): void {
    writeFileSync(path, `${JSON.stringify(value, null, 4)}\n`)
}

function updatePackageMetadata(
    path: string,
    context: TemplateContext,
    packageDir: string,
    isRoot: boolean
): void {
    const value = readJson(path)
    value.name = isRoot ? context.projectName : value.name
    value.version = '0.0.0'
    value.description = isRoot ? context.description : value.description
    value.author = context.author
    value.license = context.license
    value.repository = {
        type: 'git',
        url: `git+${context.repoUrl}.git`,
        ...(isRoot ? {} : { directory: `packages/${packageDir}` }),
    }
    value.bugs = { url: `${context.repoUrl}/issues` }
    value.homepage = isRoot
        ? `${context.repoUrl}#readme`
        : `${context.repoUrl}/tree/main/packages/${packageDir}#readme`
    if (!isRoot) {
        value.private = context.privatePackage
        value.publishConfig = {
            access: context.privatePackage ? 'restricted' : 'public',
        }
        if (context.template === 'cli') {
            value.bin = { [context.cliBin]: './dist/cli.js' }
        }
    }
    writeJson(path, value)
}

export function applyMetadata(
    destination: string,
    context: TemplateContext
): void {
    updatePackageMetadata(
        join(destination, 'package.json'),
        context,
        context.packageDir,
        true
    )
    updatePackageMetadata(
        join(destination, 'packages', context.packageDir, 'package.json'),
        context,
        context.packageDir,
        false
    )
    if (context.template === 'monorepo') {
        updatePackageMetadata(
            join(destination, 'packages/core/package.json'),
            context,
            'core',
            false
        )
    }

    const changesetPath = join(destination, '.changeset/config.json')
    const changeset = readJson(changesetPath)
    changeset.access = context.privatePackage ? 'restricted' : 'public'
    writeJson(changesetPath, changeset)
}
