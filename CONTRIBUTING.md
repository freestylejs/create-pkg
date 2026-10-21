# Contributing

## Setup

```bash
pnpm install
pnpm build
```

## Verification

```bash
pnpm ts:typecheck
pnpm check
pnpm test:coverage
pnpm verify:package
```

`verify:package` scaffolds all templates into temporary directories and runs
`test:ci` and `verify:package` in each generated repository.

## Template Changes

- Keep template files under `templates/`.
- Do not add `node_modules`, `dist`, `.trace`, or generated lockfiles to templates.
- Run `pnpm format` after editing templates.
- Run `pnpm template:check` before opening a pull request.
