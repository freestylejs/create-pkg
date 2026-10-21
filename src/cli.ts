#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import pc from 'picocolors'
import { collectOptions } from './prompts.ts'
import { scaffold } from './scaffold.ts'
import type { CliFlags, TemplateName } from './types.ts'
import { TEMPLATES } from './types.ts'

const packageJson = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8')
) as { version: string }

function printHelp(): void {
    process.stdout.write(`create-pkg ${packageJson.version}

Usage:
  create-pkg [directory] [options]

Options:
  -t, --template <name>       library | monorepo | cli (default: library)
      --package-name <name>   Full npm package name, e.g. @acme/my-lib
      --scope <scope>         Default scope for the package (default: @freestylejs)
      --description <text>    Package description
      --author <name>         Package author
      --license <name>        License (default: MIT)
      --repo-url <url>        Repository URL
      --private               Keep the package private (default)
      --public                Make the package public
      --no-install            Skip pnpm install
      --no-git                Skip git init and initial commit
      --no-verify             Skip test/package verification
  -y, --yes                   Non-interactive defaults
      --force                 Replace a non-empty target directory
  -h, --help                  Show this help
  -v, --version               Show version
`)
}

function parseArgs(argv: string[]): {
    flags: CliFlags
    targetDir?: string | undefined
} {
    const flags: CliFlags = {}
    let targetDir: string | undefined

    for (let index = 0; index < argv.length; index += 1) {
        const value = argv[index]
        if (value === undefined) break
        if (value === '-h' || value === '--help') {
            flags.help = true
        } else if (value === '-v' || value === '--version') {
            flags.version = true
        } else if (value === '-y' || value === '--yes') {
            flags.yes = true
        } else if (value === '--force') {
            flags.force = true
        } else if (value === '--private') {
            flags.privatePackage = true
        } else if (value === '--public') {
            flags.publicPackage = true
        } else if (value === '--no-install') {
            flags.install = false
        } else if (value === '--install') {
            flags.install = true
        } else if (value === '--no-git') {
            flags.git = false
        } else if (value === '--git') {
            flags.git = true
        } else if (value === '--no-verify') {
            flags.verify = false
        } else if (value === '--verify') {
            flags.verify = true
        } else if (value === '-t' || value === '--template') {
            const template = argv[index + 1]
            if (!template) throw new Error(`${value} requires a value`)
            if (!TEMPLATES.includes(template as TemplateName)) {
                throw new Error(`Unknown template: ${template}`)
            }
            flags.template = template as TemplateName
            index += 1
        } else if (value.startsWith('--template=')) {
            const template = value.slice('--template='.length)
            if (!TEMPLATES.includes(template as TemplateName)) {
                throw new Error(`Unknown template: ${template}`)
            }
            flags.template = template as TemplateName
        } else if (value === '--package-name') {
            flags.packageName = requireValue(argv, ++index, value)
        } else if (value.startsWith('--package-name=')) {
            flags.packageName = value.slice('--package-name='.length)
        } else if (value === '--scope') {
            flags.scope = requireValue(argv, ++index, value)
        } else if (value.startsWith('--scope=')) {
            flags.scope = value.slice('--scope='.length)
        } else if (value === '--description') {
            flags.description = requireValue(argv, ++index, value)
        } else if (value.startsWith('--description=')) {
            flags.description = value.slice('--description='.length)
        } else if (value === '--author') {
            flags.author = requireValue(argv, ++index, value)
        } else if (value.startsWith('--author=')) {
            flags.author = value.slice('--author='.length)
        } else if (value === '--license') {
            flags.license = requireValue(argv, ++index, value)
        } else if (value.startsWith('--license=')) {
            flags.license = value.slice('--license='.length)
        } else if (value === '--repo-url') {
            flags.repoUrl = requireValue(argv, ++index, value)
        } else if (value.startsWith('--repo-url=')) {
            flags.repoUrl = value.slice('--repo-url='.length)
        } else if (value.startsWith('-')) {
            throw new Error(`Unknown option: ${value}`)
        } else if (!targetDir) {
            targetDir = value
        } else {
            throw new Error(`Unexpected argument: ${value}`)
        }
    }
    return { flags, targetDir }
}

function requireValue(argv: string[], index: number, option: string): string {
    const value = argv[index]
    if (!value) throw new Error(`${option} requires a value`)
    return value
}

async function main(): Promise<void> {
    const { flags, targetDir } = parseArgs(process.argv.slice(2))
    if (flags.help) {
        printHelp()
        return
    }
    if (flags.version) {
        process.stdout.write(`${packageJson.version}\n`)
        return
    }

    const options = await collectOptions({ ...flags, targetDir })
    const created = scaffold(options)
    process.stdout.write(
        `\n${pc.green('Created')} ${pc.bold(options.packageName)} at ${pc.cyan(created)}\n\n`
    )
    process.stdout.write(
        `Next steps:\n  cd ${created}\n  pnpm dev\n  pnpm test:ci\n`
    )
}

main().catch((error: unknown) => {
    process.stderr.write(
        `${pc.red('create-pkg failed:')} ${error instanceof Error ? error.message : String(error)}\n`
    )
    process.exitCode = 1
})
