import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { applyMetadata, copyTemplate } from './render.ts'
import { ensureEmptyTarget } from './validate.ts'
import type { CreateOptions } from './types.ts'

const generatorRoot = fileURLToPath(new URL('..', import.meta.url))

function run(command: string, args: string[], cwd: string): void {
    const result = spawnSync(command, args, {
        cwd,
        stdio: 'inherit',
        env: { ...process.env, CI: '1', NO_COLOR: '1' },
        shell: false,
    })
    if (result.status !== 0) {
        throw new Error(
            `${command} ${args.join(' ')} failed with exit code ${result.status ?? 1}`
        )
    }
}

function initGit(target: string): void {
    run('git', ['init'], target)
}

function commitGit(target: string): void {
    run('git', ['add', '-A'], target)
    const name = spawnSync('git', ['config', 'user.name'], {
        cwd: target,
        encoding: 'utf8',
        shell: false,
    }).stdout?.trim()
    const email = spawnSync('git', ['config', 'user.email'], {
        cwd: target,
        encoding: 'utf8',
        shell: false,
    }).stdout?.trim()
    if (!name || !email) {
        console.warn(
            'git repository initialized, but no user.name/user.email is configured; initial commit skipped'
        )
        return
    }
    run('git', ['commit', '-m', 'chore: initialize project'], target)
}

export function scaffold(options: CreateOptions): string {
    ensureEmptyTarget(options.targetDir, options.force)
    const parent = dirname(options.targetDir)
    mkdirSync(parent, { recursive: true })
    const staging = join(
        parent,
        `.${basename(options.targetDir)}.create-${randomUUID().slice(0, 8)}`
    )
    const context = { ...options, year: String(new Date().getFullYear()) }

    try {
        copyTemplate(options.template, staging, context)
        applyMetadata(staging, context)

        if (existsSync(options.targetDir)) {
            rmSync(options.targetDir, { recursive: true, force: true })
        }
        renameSync(staging, options.targetDir)
    } catch (error) {
        console.error(
            `scaffold failed; staging directory preserved at ${staging}`
        )
        throw error
    }

    if (options.git) initGit(options.targetDir)
    if (options.install) run('pnpm', ['install'], options.targetDir)
    const formatter = join(
        generatorRoot,
        'node_modules',
        '.bin',
        process.platform === 'win32' ? 'oxfmt.cmd' : 'oxfmt'
    )
    if (existsSync(formatter)) {
        run(formatter, ['.'], options.targetDir)
    } else {
        console.warn('oxfmt not found; generated files may need formatting')
    }
    if (options.verify) {
        run('pnpm', ['test:ci'], options.targetDir)
        run('pnpm', ['verify:package'], options.targetDir)
    }
    if (options.git) commitGit(options.targetDir)

    return options.targetDir
}
