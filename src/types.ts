export const TEMPLATES = ['library', 'monorepo', 'cli'] as const

export type TemplateName = (typeof TEMPLATES)[number]

export interface CreateOptions {
    targetDir: string
    projectName: string
    packageName: string
    packageDir: string
    corePackageName: string
    cliBin: string
    template: TemplateName
    description: string
    author: string
    license: string
    privatePackage: boolean
    install: boolean
    git: boolean
    verify: boolean
    force: boolean
    repoUrl: string
}

export interface TemplateContext extends CreateOptions {
    year: string
}

export interface CliFlags {
    targetDir?: string | undefined
    template?: TemplateName
    packageName?: string
    scope?: string
    description?: string
    author?: string
    license?: string
    publicPackage?: boolean
    privatePackage?: boolean
    install?: boolean
    git?: boolean
    verify?: boolean
    yes?: boolean
    force?: boolean
    repoUrl?: string
    help?: boolean
    version?: boolean
}
