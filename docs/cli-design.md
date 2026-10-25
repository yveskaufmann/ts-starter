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
| `<variant>` | Flavour of the stamp, e.g. `ts`, `go`. Omitted: a prompt, or an error without a terminal |
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

Files that already exist in the target directory are handled by the conflict rules below; other files in it are left alone.

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

## Stamp manifest

`stamps/<name>/<variant>/stamp.json` (validated when loaded; an invalid manifest is a startup error that names the file):

| Field         | Type                           | Required | Meaning                                                              |
| ------------- | ------------------------------ | -------- | -------------------------------------------------------------------- |
| `description` | string                         | yes      | One line shown by `list` and `info`                                  |
| `mode`        | `"project"` \| `"inject"`      | yes      | See [Target rules](#target-rules)                                    |
| `prompts`     | array of prompt objects        | no       | Questions asked for this stamp; see below                            |
| `includes`    | array of `"<stamp>:<variant>"` | no       | Stamps applied before this stamp's own files                         |
| `files`       | string (default `"files"`)     | no       | Directory, relative to the manifest, holding the files of this stamp |

A prompt object has `name` (variable name), `message`, optional `default` and optional `type` (`input` or `confirm`, default `input`).
A prompt with the same `name` in an included stamp is asked once; the including stamp's definition wins.

An `includes` entry must name an existing stamp and variant, and an app may only include `inject` stamps.
Cycles are an error and the message lists the chain.

## File rendering

- Every file below `files/` is written to the same relative path in the target directory.
- A file ending in `.hbs` is rendered with Handlebars and written without the extension (`package.json.hbs` becomes `package.json`).
  All other files are copied byte for byte, so binary files are safe.
- Dot-files are included. Empty directories are not created.
- Variables are the answers to the prompts. Helpers: `dashCase`, `camelCase`, `pascalCase`, `snakeCase`, `upperCase`, `lowerCase`.
- A missing variable is an error, not an empty string.
- File contents are written exactly as rendered; Prettier formatting is checked by the CI job, not applied by the CLI.

## Resolving a run

1. Parse the arguments and find the stamp and variant (prompt for the variant when it is missing, see decision 1).
2. Flatten `includes` depth-first into an ordered list of stamps, removing duplicates (first occurrence wins).
3. Collect the prompts of all stamps, drop duplicates, and answer them from `--set`, then `--yes` defaults, then interactive prompts.
4. Resolve the target directory (see [Target rules](#target-rules)).
5. Render every file in memory. Later stamps overwrite earlier ones, and the stamp's own files come last.
6. Compare with the target directory and handle conflicts (see [Conflicts](#conflicts)).
7. Write the files; `--dry-run` stops before this step and prints the plan.

Nothing is written before step 7, so an error or an aborted prompt leaves the target directory untouched.
The one exception is a new project directory, which is removed again if writing fails half way.

## Command line behavior

- `--help` is available on every command, `--version` on the program. Unknown commands and options print the usage and exit with code 2.
- Exit codes: `0` success, `1` the run failed (invalid manifest, write error, conflicts without a terminal), `2` usage error, `130` interrupted by the user.
- Output goes to stdout; errors, prompts and warnings go to stderr. `list --json` and `__complete` print only data on stdout.
- `NO_COLOR` and a missing terminal disable colors.
- Node 22 or newer, matching the dependencies used by the release workflow.

## Architecture

```
index.js                  # bin entry: calls src/cli.js
src/
  cli.js                  # parse arguments, dispatch to a command, map errors to exit codes
  commands/               # create.js, list.js, info.js, completion.js, complete.js (hidden)
  stamps/
    registry.js           # find stamps in stamps/, load and validate manifests
    resolve.js            # includes flattening, prompt collection
    render.js             # Handlebars rendering and file copying into an in-memory file list
    write.js              # conflict handling, dry-run, writing
  prompts.js              # thin wrapper around the prompt library, never prompts without a terminal
  completion/             # bash.sh, zsh.sh scripts
stamps/                   # the stamps, see Layout
```

Choices:

- **Arguments:** `node:util` `parseArgs`. No dependency, and the grammar here is small.
- **Prompts:** `@inquirer/prompts`.
- **Rendering:** `handlebars` and `change-case` directly. plop is dropped, because its `addMany` action cannot prompt per file or do a dry run.
  This replaces the earlier idea of keeping plop as a library for rendering. The existing `.hbs` templates keep working unchanged.
- The commands only deal with input and output; `src/stamps` has no knowledge of the terminal, so it can be unit tested with plain objects.

## Migrating `templates/ts-app`

`app:ts` replaces `templates/ts-app`. The files move into stamps without changing their content:

| Stamp             | Files                                                              |
| ----------------- | ------------------------------------------------------------------ |
| `app:ts`          | `package.json.hbs`, `README.md.hbs`, `Makefile`, `src/*`, `.nvmrc` |
| `editorconfig:ts` | `.editorconfig`                                                    |
| `editorconfig:go` | `.editorconfig` (tabs for Go files)                                |
| `prettier:ts`     | `.prettierrc.json`                                                 |
| `tsconfig:ts`     | `tsconfig.json`                                                    |
| `vitest:ts`       | `vitest.config.ts`                                                 |
| `vscode:ts`       | `.vscode/settings.json`, `.vscode/launch.json`                     |
| `gitignore:node`  | `.gitignore`                                                       |

`vitest:ts` and `tsconfig:ts` write only their own files. Their entries in `package.json` stay in `app:ts` until stamps can edit files.
The project generated by `create app:ts` must match the one generated today; the snapshot test and the CI job check this.

## Testing

- **Unit tests** (vitest, for the generator itself): manifest validation, includes flattening and cycles, prompt merging, rendering, conflict resolution, argument parsing and the output of `__complete`.
- **Integration tests:** run the real `index.js` in a temporary directory with `--yes --set ...` and check the files; run `create editorconfig:ts` twice and check the second run needs `--force` or `--skip-existing` without a terminal.
- **Snapshot test:** the file list and contents of `create app:ts` are snapshotted so migration changes are visible in review.
- **CI:** the existing workflow keeps generating, formatting-checking, building and testing a project, now through `create app:ts`. It gains a step that runs the unit and integration tests.
- Completion scripts are tested by running `bash -c` with `COMP_WORDS`/`COMP_CWORD` set; the zsh script is only syntax checked (`zsh -n`).

## Delivery

Each step is a pull request on top of the previous one:

1. Generator core: registry, manifest validation, resolve, render, write, with unit tests (no command line yet).
2. `create` command, `list`, `info`, argument parsing and exit codes (`src/cli.js`, started with `src/bin.js`). `index.js` still runs plop, because there is no `app:ts` stamp yet.
3. Stamps: split `templates/ts-app` into the stamps above, add `editorconfig:go`, switch the `ts-starter` binary to the new CLI, remove plop and `templates/`.
4. `completion` and the hidden `__complete` command.
5. README, CI workflow update and the removal of the old command form.

## Out of scope for the first version

Editing existing files and adding npm dependencies, user or project stamp folders, recording applied stamps, an `update` command,
creating new stamps from the command line, and shells other than bash and zsh.

## Decisions

1. **Omitted variant:** `create app` prompts for the variant. Without a terminal it fails and lists the variants.
2. **Editing files:** the first version only writes whole files. Adding npm dependencies and altering existing files (for example merging into `package.json`) is a possible later extension.
3. **Stamp source:** stamps ship only in this package. User or project stamp folders can be added later without breaking anything.
4. **Re-applying:** running a stamp again uses the normal per-file conflict prompt. Applied stamps are not recorded in the project.
5. **Old CLI form:** `ts-starter <name> <description> <author>` is dropped without an alias. `ts-starter` without arguments prints help, and the CI workflow and README move to `create app:ts <name> --set ...`.
6. **Shells:** `completion` supports bash and zsh only. Other shells can be added later without changing the design.
