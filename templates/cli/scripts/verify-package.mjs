import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const cli = join(root, 'packages/__PACKAGE_DIR__/dist/cli.js')

if (!existsSync(cli)) {
    throw new Error(`CLI build is missing: ${cli}`)
}

const result = spawnSync(process.execPath, [cli, 'Ada'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, CI: '1', NO_COLOR: '1' },
    shell: false,
})

if (result.status !== 0) {
    throw new Error(
        `CLI failed\n${result.stdout ?? ''}\n${result.stderr ?? ''}`
    )
}
if (!result.stdout.includes('Hello, Ada!')) {
    throw new Error(`Unexpected CLI output: ${result.stdout}`)
}

process.stdout.write('CLI contract verification passed\n')
