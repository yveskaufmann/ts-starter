# TypeScript Starter

A personal project starter. It creates new projects from an **app** and adds small, reusable **stamps** like an
`.editorconfig` to existing ones.

Everything is a stamp: an app is a stamp that is composed of other stamps. The stamps can have variants for different
languages, e.g. `editorconfig:ts` and `editorconfig:go`.

## Installation

Use it directly with `npx`, or install it globally:

```bash
npx @yveskaufmann/ts-starter create app:ts

npm install -g @yveskaufmann/ts-starter
```

Node.js 22 or newer is required.

## Usage

```
ts-starter create <stamp>[:<variant>] [target] [options]
ts-starter list [stamp] [--json]
ts-starter info <stamp>:<variant>
ts-starter completion <bash|zsh>
```

### Create a project

```bash
# Ask for the name, create ./<name>
ts-starter create app:ts

# Create ./my-app
ts-starter create app:ts my-app

# Use the current directory, the name is the name of the folder
ts-starter create app:ts .
```

The project name is turned into a dash-cased directory name, `My App` becomes `my-app`. `app:ts` also asks for a
description and an author, the answers can be given on the command line:

```bash
ts-starter create app:ts my-app --set description="My app" --set author="Jane <jane@example.org>"
```

### Add a stamp to an existing directory

```bash
# Add an .editorconfig for TypeScript projects to the current directory
ts-starter create editorconfig:ts

# Add an .editorconfig for Go projects to ./service
ts-starter create editorconfig:go service
```

If you leave out the variant (`ts-starter create editorconfig`), you are asked which one you want.

### Options of `create`

| Option            | Effect                                                           |
| ----------------- | ---------------------------------------------------------------- |
| `--set key=value` | Answer a prompt without asking, can be repeated                  |
| `-y`, `--yes`     | Use the default of every prompt that has one                     |
| `--dry-run`       | Show which files would be created, overwritten or kept, and stop |
| `--force`         | Overwrite existing files without asking                          |
| `--skip-existing` | Keep existing files without asking                               |

### Existing files

When a file already exists with other content, you are asked per file whether to overwrite it, keep it, show a diff, or
do the same for all following files. Files with identical content are left alone. Nothing is written before all files
are rendered, so an error does not leave a half written project.

Without a terminal (CI, scripts) nothing is asked: the command fails before it writes anything, unless `--force` or
`--skip-existing` is given. In the same way a missing value fails with a hint to use `--set`, or `--yes` to take the
default.

### Exit codes

| Code  | Meaning                                                              |
| ----- | -------------------------------------------------------------------- |
| `0`   | Success                                                              |
| `1`   | The run failed, e.g. an unknown stamp, a conflict without a terminal |
| `2`   | Wrong usage of the command line                                      |
| `130` | A prompt was interrupted (Ctrl-C), nothing was written               |

## Available stamps

```bash
ts-starter list
```

| Stamp             | Mode      | Writes                                                                                             |
| ----------------- | --------- | -------------------------------------------------------------------------------------------------- |
| `app:ts`          | `project` | A TypeScript app: `package.json`, `README.md`, `Makefile`, `.nvmrc`, `src/`, plus the stamps below |
| `editorconfig:ts` | `inject`  | `.editorconfig` for TypeScript and JavaScript                                                      |
| `editorconfig:go` | `inject`  | `.editorconfig` for Go (tabs)                                                                      |
| `prettier:ts`     | `inject`  | `.prettierrc.json`                                                                                 |
| `tsconfig:ts`     | `inject`  | `tsconfig.json` for node                                                                           |
| `vitest:ts`       | `inject`  | `vitest.config.ts`                                                                                 |
| `vscode:ts`       | `inject`  | `.vscode/settings.json` and `.vscode/launch.json`                                                  |
| `gitignore:node`  | `inject`  | `.gitignore`                                                                                       |

`ts-starter info app:ts` shows the values a stamp asks for, the stamps it includes and the files it writes.

The generated TypeScript project uses [Vitest](https://vitest.dev) for the tests, [tsx](https://tsx.is) to run the code,
Prettier for the formatting and a `Makefile` with the targets `build`, `test`, `start`, `clean` and `help`.

## Tab completion

```bash
# bash, add to ~/.bashrc
source <(ts-starter completion bash)

# zsh, add to ~/.zshrc
source <(ts-starter completion zsh)
```

Commands, stamps with their variants, options, the keys of `--set` and directories are completed. The suggestions are
asked from `ts-starter` itself, so new stamps are completed without updating the script.

## Development

```bash
npm install
npm test                # unit tests and the tests of the completion scripts
npm run format:check    # prettier
node index.js create app:ts demo
```

The design is described in [docs/cli-design.md](docs/cli-design.md).

### Add a stamp

A stamp is a directory `stamps/<name>/<variant>/` with a `stamp.json` and the files it writes in `files/`:

```
stamps/editorconfig/go/
  stamp.json
  files/.editorconfig
```

```json
{
  "description": "EditorConfig for Go projects",
  "mode": "inject"
}
```

- `mode` is `inject` (add files to a directory) or `project` (create a new directory, needs a prompt called `name`).
- `prompts` lists what the stamp asks for: `name`, `message`, optional `default` and `type` (`input` or `confirm`).
- `includes` lists `<stamp>:<variant>` ids of `inject` stamps that are applied first. Prompts are asked once, even if
  several stamps use them.
- Files ending in `.hbs` are rendered with [Handlebars](https://handlebarsjs.com) and lose the extension, all other
  files are copied as they are. Use `.gitignore.hbs` for a `.gitignore`, npm does not publish files with that name.
  Missing values are an error. The helpers `dashCase`, `camelCase`, `pascalCase`, `snakeCase`, `upperCase` and
  `lowerCase` are available.

Names and variants may only contain lower case letters, digits and `-`. A new stamp shows up in `list` and in the
completion without further changes.

## Releases

Releases are made with semantic-release from conventional commits. The commit message decides the next version, a
`BREAKING CHANGE:` footer or a `!` after the type makes a major release.

---

Created by Yves Kaufmann
