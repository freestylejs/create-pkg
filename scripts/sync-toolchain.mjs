import { readFileSync, writeFileSync } from 'node:fs'
import { toolchain } from '@freestylejs/config/toolchain'

const root = new URL('../', import.meta.url)
const packagePath = new URL('package.json', root)
const nvmrcPath = new URL('.nvmrc', root)
const write = process.argv.includes('--write')

const versions = {
    '@changesets/cli': toolchain.changesets,
    '@freestylejs/config': toolchain.config,
    '@types/node': toolchain.typesNode,
    '@vitest/coverage-v8': toolchain.coverageV8,
    oxfmt: toolchain.oxfmt,
    oxlint: toolchain.oxlint,
    publint: toolchain.publint,
    tsdown: toolchain.tsdown,
    typescript: toolchain.typescript,
    vite: toolchain.vite,
    vitest: toolchain.vitest,
}

const pkg = JSON.parse(readFileSync(packagePath, 'utf8'))
const drifted = []

for (const [name, version] of Object.entries(versions)) {
    const actual = pkg.dependencies?.[name] ?? pkg.devDependencies?.[name]
    if (actual !== version) {
        drifted.push(`${name}: ${actual ?? 'missing'} -> ${version}`)
        if (write) {
            if (pkg.dependencies?.[name] !== undefined)
                pkg.dependencies[name] = version
            else {
                pkg.devDependencies ??= {}
                pkg.devDependencies[name] = version
            }
        }
    }
}

const expectedPackageManager = `pnpm@${toolchain.pnpm}`
if (pkg.packageManager !== expectedPackageManager) {
    drifted.push(
        `packageManager: ${pkg.packageManager} -> ${expectedPackageManager}`
    )
    if (write) pkg.packageManager = expectedPackageManager
}

const nvmrc = readFileSync(nvmrcPath, 'utf8').trim()
if (nvmrc !== toolchain.node) {
    drifted.push(`.nvmrc: ${nvmrc} -> ${toolchain.node}`)
    if (write) writeFileSync(nvmrcPath, `${toolchain.node}\n`)
}

if (write) {
    writeFileSync(packagePath, `${JSON.stringify(pkg, null, 4)}\n`)
    process.stdout.write('updated toolchain versions\n')
} else if (drifted.length > 0) {
    process.stderr.write(
        `toolchain drift detected:\n${drifted.map((item) => `  - ${item}`).join('\n')}\n`
    )
    process.exitCode = 1
} else {
    process.stdout.write('toolchain versions are synchronized\n')
}
