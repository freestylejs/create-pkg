import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const cli = join(root, 'dist', 'cli.js')
const templates = ['library', 'monorepo', 'cli']

function run(command, args, cwd) {
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

for (const template of templates) {
    const workspace = mkdtempSync(join(tmpdir(), `create-pkg-${template}-`))
    const target = join(workspace, template)
    process.stdout.write(`\n=== template: ${template} ===\n`)
    try {
        run(
            process.execPath,
            [
                cli,
                target,
                '--template',
                template,
                '--package-name',
                `@test/${template}`,
                '--yes',
                '--no-install',
                '--no-git',
            ],
            root
        )
        if (process.env.CREATE_PKG_CONFIG_OVERRIDE) {
            const packagePath = join(target, 'package.json')
            const pkg = JSON.parse(readFileSync(packagePath, 'utf8'))
            pkg.pnpm ??= {}
            pkg.pnpm.overrides ??= {}
            pkg.pnpm.overrides['@freestylejs/config'] =
                `link:${process.env.CREATE_PKG_CONFIG_OVERRIDE}`
            writeFileSync(packagePath, `${JSON.stringify(pkg, null, 4)}\n`)
        }
        run('pnpm', ['install', '--no-frozen-lockfile'], target)
        run('pnpm', ['format'], target)
        run('pnpm', ['test:ci'], target)
        run('pnpm', ['verify:package'], target)
    } finally {
        rmSync(workspace, { recursive: true, force: true })
    }
}

process.stdout.write('\nAll template checks passed.\n')
