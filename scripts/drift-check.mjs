import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { toolchainPlaceholders } from '@freestylejs/config/toolchain'

const args = process.argv.slice(2)
const write = args.includes('--write')
const referenceIndex = args.indexOf('--reference')
const reference = resolve(
    referenceIndex >= 0 ? args[referenceIndex + 1] : '../pkg'
)
const templateRoot = resolve('templates/_base')
const referenceContext = {
    __PACKAGE_DIR__: 'pkg',
    __PACKAGE_NAME__: '@freestylejs/pkg',
    __CORE_PACKAGE_NAME__: '@freestylejs/pkg',
}
const sharedFiles = [
    '.changeset/config.json',
    '.gitattributes',
    '.github/dependabot.yml',
    '.github/workflows/ci.yml',
    '.github/workflows/release.yml',
    '.husky/pre-commit',
    '.lintstagedrc',
    '.npmrc',
    '.nvmrc',
    '.vscode/settings.json',
    'CONTRIBUTING.md',
    'SECURITY.md',
    'asset/commit.md',
    'oxfmt.config.ts',
    'pnpm-workspace.yaml',
    'tsconfig.json',
    'turbo.json',
    'vitest.config.ts',
]
const sharedScripts = [
    'build',
    'build:clean',
    'build:fast',
    'check',
    'dev',
    'format',
    'lint',
    'pkg:init',
    'pkg:publish',
    'pkg:version',
    'pre-commit',
    'report',
    'reset',
    'reset:dist',
    'reset:modules',
    'reset:turbo',
    'start',
    'sync:check',
    'sync:toolchain',
    'test',
    'test:ci',
    'test:coverage',
    'test:watch',
    'ts:perf',
    'ts:typecheck',
]

function render(value) {
    let rendered = value
    for (const [placeholder, replacement] of Object.entries(
        toolchainPlaceholders
    )) {
        rendered = rendered.replaceAll(placeholder, replacement)
    }
    for (const [placeholder, replacement] of Object.entries(referenceContext)) {
        rendered = rendered.replaceAll(placeholder, replacement)
    }
    return rendered
}

function read(path) {
    return readFileSync(path, 'utf8')
}

function normalize(value) {
    return value.replace(/\s/g, '')
}

function checkReference() {
    if (!existsSync(join(reference, 'package.json'))) {
        throw new Error(`reference repository not found at ${reference}`)
    }
}

function compareFile(path, referencePathRelative, drift) {
    const templatePath = join(templateRoot, path)
    const referencePath = join(reference, referencePathRelative)
    if (!existsSync(templatePath)) return
    if (!existsSync(referencePath)) {
        drift.push(`${path}: missing in reference`)
        return
    }
    const expected = render(read(templatePath))
    const actual = read(referencePath)
    if (normalize(expected) !== normalize(actual)) {
        drift.push(`${referencePathRelative}: content differs`)
        if (write) writeFileSync(referencePath, expected)
    }
}

function compareScripts(drift) {
    const template = JSON.parse(read(join(templateRoot, 'package.json')))
    const referencePackagePath = join(reference, 'package.json')
    const referencePackage = JSON.parse(read(referencePackagePath))
    for (const name of sharedScripts) {
        if (template.scripts?.[name] === undefined) continue
        if (referencePackage.scripts?.[name] !== template.scripts[name]) {
            drift.push(`package.json scripts.${name}: differs`)
            if (write) referencePackage.scripts[name] = template.scripts[name]
        }
    }
    if (write) {
        writeFileSync(
            referencePackagePath,
            `${JSON.stringify(referencePackage, null, 4)}\n`
        )
    }
}

try {
    checkReference()
    const drift = []
    for (const path of sharedFiles) compareFile(path, path, drift)
    compareFile('gitignore', '.gitignore', drift)
    compareFile('npmignore', '.npmignore', drift)
    compareScripts(drift)

    if (drift.length > 0) {
        if (write) {
            process.stdout.write(
                `resolved ${drift.length} reference drift item(s)\n`
            )
        } else {
            process.stderr.write(
                `reference drift detected:\n${drift
                    .map((item) => `  - ${item}`)
                    .join('\n')}\n`
            )
            process.exitCode = 1
        }
    } else {
        process.stdout.write('reference repository is synchronized\n')
    }
} catch (error) {
    process.stderr.write(
        `${error instanceof Error ? error.message : String(error)}\n`
    )
    process.exitCode = 1
}
