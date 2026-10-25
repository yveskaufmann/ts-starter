# ts-starter CLI design (draft)

## Goal

One command, `ts-starter create`, that either scaffolds a whole project or injects a small piece into an existing one.
Both are the same thing: a **stamp**. An app is a stamp that is composed of other stamps.

## Command

```
ts-starter create <stamp>[:<variant>] [target] [options]
```

| Part        | Meaning                                                                          |
| ----------- | -------------------------------------------------------------------------------- |
| `<stamp>`   | Name of the stamp, e.g. `app`, `editorconfig`, `prettier`                        |
| `<variant>` | Flavour of the stamp, e.g. `ts`, `go`. Omitted: the stamp's default, or a prompt |
| `[target]`  | Directory to write into. See [Target rules](#target-rules)                       |

### Examples

```bash
# New app from the ts variant of the app stamp; the name is prompted
ts-starter create app:ts

# Same, with the name "Test" (creates ./test)
ts-starter create app:ts Test

# Same, but into the current directory, the name is taken from the folder
ts-starter create app:ts .

# Inject an editor config for ts / go into the current directory
ts-starter create editorconfig:ts
ts-starter create editorconfig:go
```

### Other commands

```
ts-starter list [stamp]      # list stamps and their variants (`--json` for scripts)
ts-starter info <stamp>:<v>  # description, prompts, included stamps, files written
ts-starter completion <shell> # print the tab completion script for bash or zsh
```

### Options

| Option            | Effect                                                               |
| ----------------- | -------------------------------------------------------------------- |
| `--force`         | Overwrite existing files without asking                              |
| `--skip-existing` | Keep existing files without asking                                   |
| `--dry-run`       | Print the files that would be written and which ones conflict        |
| `--yes`           | Accept defaults for every prompt that has one (for CI and scripts)   |
| `--set key=value` | Answer a prompt non-interactively, e.g. `--set description="My app"` |

## Tab completion

`ts-starter completion bash|zsh` prints a completion script. Other shells fail with a list of the supported ones.

```bash
# bash: add to ~/.bashrc
source <(ts-starter completion bash)

# zsh: add to ~/.zshrc
source <(ts-starter completion zsh)
```

What is completed:

| Position                               | Suggestions                                      |
| -------------------------------------- | ------------------------------------------------ |
| `ts-starter <TAB>`                     | commands: `create`, `list`, `info`, `completion` |
| `ts-starter create <TAB>`              | stamp names, e.g. `app`, `editorconfig`          |
| `ts-starter create editorconfig:<TAB>` | variants of that stamp, e.g. `ts`, `go`          |
| `ts-starter create app:ts <TAB>`       | directories (shell default)                      |
| `ts-starter create --<TAB>`            | options of the command                           |
| `ts-starter info <TAB>`                | `<stamp>:<variant>` pairs                        |
| `ts-starter list <TAB>`                | stamp names                                      |
| `ts-starter completion <TAB>`          | `bash`, `zsh`                                    |

The script is static and small. For every suggestion it calls a hidden command, `ts-starter __complete <words...>`, which prints
one suggestion per line from the built-in stamps. New stamps and variants therefore show up without regenerating the script.
`__complete` must be fast (no prompts, no network) and never fail loudly; on any error it prints nothing.

## Target rules

A stamp declares whether it creates a project or modifies one (`"mode": "project" | "inject"`):

| Mode      | `[target]` omitted                               | `[target]` is a name        | `[target]` is `.`               |
| --------- | ------------------------------------------------ | --------------------------- | ------------------------------- |
| `project` | prompt for the name, create `./<dash-case name>` | create `./<dash-case name>` | use the cwd, name = folder name |
| `inject`  | cwd                                              | `./<name>` (must exist)     | cwd                             |

A `project` stamp refuses a non-empty directory unless `--force` or the conflict prompt is used.

## Conflicts

Per file, when it already exists: ask `overwrite / skip / show diff / overwrite all / skip all`.
Non-interactive (no TTY): fail before writing anything, unless `--force` or `--skip-existing` is given.
Files written by stamps included in the same run never prompt against each other; later includes win.

## Layout

```
stamps/
  app/
    ts/
      stamp.json
      files/...          # files of this stamp only; *.hbs files are rendered with Handlebars
  editorconfig/
    ts/   stamp.json  files/.editorconfig
    go/   stamp.json  files/.editorconfig
  prettier/ts/ ...
  vitest/ts/ ...
```

### `stamp.json`

```json
{
  "description": "TypeScript application",
  "mode": "project",
  "prompts": [
    { "name": "name", "message": "What is the project name?" },
    {
      "name": "description",
      "message": "Project description:",
      "default": "A TypeScript project"
    },
    { "name": "author", "message": "Author name:" }
  ],
  "includes": [
    "editorconfig:ts",
    "prettier:ts",
    "tsconfig:ts",
    "vitest:ts",
    "vscode:ts",
    "gitignore:node"
  ]
}
```

- Prompt answers are passed to included stamps, so `name` and `author` are asked once.
- A stamp can have `files`, `includes`, or both.
- Includes are applied in order, then the stamp's own files.

## Implementation notes

- Own command-line parser (subcommands, `--help` per command); plop is kept as a library for Handlebars rendering and file writing.
- Today's `templates/ts-app` is split into stamps and becomes `app:ts`. `ts-starter` without arguments prints help.
- The current positional-argument form (`ts-starter <name> <description> <author>`) used by CI moves to `create app:ts <name> --set ...`.

## Decisions

1. **Omitted variant:** `create app` prompts for the variant. Without a terminal it fails and lists the variants.
2. **Editing files:** the first version only writes whole files. Adding npm dependencies and altering existing files (for example merging into `package.json`) is a possible later extension.
3. **Stamp source:** stamps ship only in this package. User or project stamp folders can be added later without breaking anything.
4. **Re-applying:** running a stamp again uses the normal per-file conflict prompt. Applied stamps are not recorded in the project.
5. **Old CLI form:** `ts-starter <name> <description> <author>` is dropped without an alias. `ts-starter` without arguments prints help, and the CI workflow and README move to `create app:ts <name> --set ...`.
6. **Shells:** `completion` supports bash and zsh only. Other shells can be added later without changing the design.
