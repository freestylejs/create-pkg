# @freestylejs/create-pkg

Create a freestylejs package repository from a maintained template.

```bash
pnpm create @freestylejs/pkg my-lib
# or
pnpm dlx @freestylejs/create-pkg my-lib --template library
```

## Templates

| Template   | Description                                         |
| ---------- | --------------------------------------------------- |
| `library`  | Single publishable library package                  |
| `monorepo` | Workspace with a starter package and a core package |
| `cli`      | Node CLI package with a `bin` entry                 |

## Usage

```bash
create-pkg my-lib \
  --template library \
  --package-name @acme/my-lib \
  --description "My library" \
  --author "Acme" \
  --private
```

Non-interactive defaults:

```bash
create-pkg my-lib \
  --template library \
  --package-name @acme/my-lib \
  --yes \
  --no-install \
  --no-git
```

## Options

| Option                  | Description                           |
| ----------------------- | ------------------------------------- |
| `-t, --template <name>` | `library`, `monorepo`, or `cli`       |
| `--package-name <name>` | Full npm package name                 |
| `--scope <scope>`       | Default scope, default `@freestylejs` |
| `--description <text>`  | Package description                   |
| `--author <name>`       | Package author                        |
| `--license <name>`      | License, default `MIT`                |
| `--repo-url <url>`      | Repository URL                        |
| `--private`             | Keep package private (default)        |
| `--public`              | Make package public                   |
| `--no-install`          | Skip `pnpm install`                   |
| `--no-git`              | Skip Git initialization               |
| `--no-verify`           | Skip generated-repo checks            |
| `-y, --yes`             | Use non-interactive defaults          |
| `--force`               | Replace a non-empty target directory  |

## Generated Repository

Generated projects use:

- pnpm workspace + Turborepo
- tsdown (Rolldown + Oxc)
- TypeScript 7
- Vitest
- Oxlint / Oxfmt
- Changesets
- package contract checks (`publint`, `attw`, packed consumer)

The generator verifies every template in CI by scaffolding it into a temp
directory and running its `test:ci` and `verify:package` commands.

## Development

```bash
pnpm install
pnpm build
pnpm test:coverage
pnpm check
pnpm template:check
```
