import { confirm, isCancel, select, text } from '@clack/prompts'
import { basename, resolve } from 'node:path'
import { normalizeScope, resolveOptions } from './validate.ts'
import {
    TEMPLATES,
    type CliFlags,
    type CreateOptions,
    type TemplateName,
} from './types.ts'

function cancelled(value: unknown): never | void {
    if (isCancel(value)) {
        process.stdout.write('Cancelled.\n')
        process.exit(0)
    }
}

function defaultScope(flags: CliFlags): string {
    return normalizeScope(flags.scope)
}

export async function collectOptions(flags: CliFlags): Promise<CreateOptions> {
    const interactive = !flags.yes
    if (!flags.targetDir && flags.yes) {
        throw new Error('A target directory is required when using --yes')
    }

    const targetInput =
        flags.targetDir ??
        (await text({
            message: 'Project directory',
            placeholder: 'my-lib',
            defaultValue: 'my-lib',
        }))
    cancelled(targetInput)
    const targetDir = resolve(String(targetInput))
    const projectName = basename(targetDir)

    const template =
        flags.template ??
        (interactive
            ? ((await select({
                  message: 'Template',
                  options: TEMPLATES.map((value) => ({ value, label: value })),
                  initialValue: 'library',
              })) as TemplateName)
            : 'library')
    cancelled(template)

    const scope =
        flags.scope ??
        (flags.packageName?.startsWith('@')
            ? flags.packageName.slice(0, flags.packageName.indexOf('/'))
            : interactive
              ? String(
                    await text({
                        message: 'Package scope',
                        defaultValue: defaultScope(flags),
                    })
                )
              : defaultScope(flags))
    cancelled(scope)

    const packageName =
        flags.packageName ??
        (interactive
            ? String(
                  await text({
                      message: 'Package name',
                      defaultValue: `${normalizeScope(scope)}/${projectName}`,
                  })
              )
            : `${normalizeScope(scope)}/${projectName}`)
    cancelled(packageName)

    const description =
        flags.description ??
        (interactive
            ? String(
                  await text({
                      message: 'Description',
                      defaultValue: `${projectName} package`,
                  })
              )
            : `${projectName} package`)
    cancelled(description)

    const author =
        flags.author ??
        (interactive
            ? String(
                  await text({ message: 'Author', defaultValue: 'freestyle' })
              )
            : 'freestyle')
    cancelled(author)

    const license =
        flags.license ??
        (interactive
            ? String(await text({ message: 'License', defaultValue: 'MIT' }))
            : 'MIT')
    cancelled(license)

    const privatePackage =
        flags.privatePackage ??
        (flags.publicPackage
            ? false
            : interactive
              ? Boolean(
                    await confirm({
                        message: 'Keep the package private?',
                        initialValue: true,
                    })
                )
              : true)
    cancelled(privatePackage)

    const install =
        flags.install ??
        (interactive
            ? Boolean(
                  await confirm({
                      message: 'Install dependencies after scaffolding?',
                      initialValue: true,
                  })
              )
            : true)
    cancelled(install)

    const git =
        flags.git ??
        (interactive
            ? Boolean(
                  await confirm({
                      message: 'Initialize a Git repository?',
                      initialValue: true,
                  })
              )
            : true)
    cancelled(git)

    return resolveOptions(
        {
            ...flags,
            targetDir,
            template,
            scope: normalizeScope(scope),
            packageName,
            description,
            author,
            license,
            privatePackage,
            install,
            git,
            verify: flags.verify ?? install,
        },
        { projectName }
    )
}
