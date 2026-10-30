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
ts-starter <command> [options]
```

| Command                               | What it does                                                    |
| ------------------------------------- | --------------------------------------------------------------- |
| `create <stamp>[:<variant>] [target]` | Create a project or add a stamp to a directory                  |
| `list [stamp]`                        | List the available stamps and variants                          |
| `info <stamp>:<variant>`              | Show what a stamp asks for, which stamps it includes, its files |

Options that work everywhere:

| Option            | Effect            |
| ----------------- | ----------------- |
| `-h`, `--help`    | Show the usage    |
| `-v`, `--version` | Print the version |

Without a command the usage is printed to stderr and the exit code is 2. Unknown commands and options, options a command
does not support, and surplus arguments are usage errors (also exit code 2) that print a hint to `--help`.

### `create`

```
ts-starter create <stamp>[:<variant>] [target] [options]
```

| Argument    | Meaning                                                                                                                    |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| `<stamp>`   | Name of the stamp, e.g. `app`, `editorconfig`. See [Available stamps](#available-stamps)                                   |
| `<variant>` | Flavour of the stamp, e.g. `ts`, `go`. If it is left out you are asked, without a terminal it fails and lists the variants |
| `[target]`  | Where to write, see [Where the files go](#where-the-files-go)                                                              |

| Option            | Effect                                                                        |
| ----------------- | ----------------------------------------------------------------------------- |
| `--set key=value` | Answer a prompt without asking, can be repeated. The keys are shown by `info` |
| `-y`, `--yes`     | Use the default of every prompt that has one                                  |
| `--dry-run`       | Show what would happen to each file and stop. Nothing is written              |
| `--force`         | Overwrite existing files without asking                                       |
| `--skip-existing` | Keep existing files without asking. Cannot be combined with `--force`         |

#### Create a project

```bash
# Ask for the name, create ./<name>
ts-starter create app:ts

# Create ./my-app
ts-starter create app:ts my-app

# Use the current directory, the name is the name of the folder
ts-starter create app:ts .

# Give the other values on the command line
ts-starter create app:ts my-app --set description="My app" --set author="Jane <jane@example.org>"

# Use the defaults for everything that has one, e.g. in a script
ts-starter create app:ts my-app --yes
```

#### Add a stamp to an existing directory

```bash
# Add an .editorconfig for TypeScript projects to the current directory
ts-starter create editorconfig:ts

# Add an .editorconfig for Go projects to ./service
ts-starter create editorconfig:go service

# Look first at what would happen
ts-starter create biome:ts --dry-run
```

#### Where the files go

A stamp is either a `project` (creates a new directory) or an `inject` stamp (adds files to a directory). `list` shows
which.

| Stamp mode | No `[target]`                         | `[target]` is a name                       | `[target]` is `.`                         |
| ---------- | ------------------------------------- | ------------------------------------------ | ----------------------------------------- |
| `project`  | Asks for the name, creates `./<name>` | Creates `./<name>`, it is the project name | Uses the current directory, name = folder |
| `inject`   | Current directory                     | `./<target>`, the directory must exist     | Current directory                         |

The directory is the project name in dash case: `My App` becomes `my-app`. A project target is a name, not a path
(`../x` is rejected), and `--set name=...` must agree with it.

#### Values and prompts

A stamp can ask for values, for example the name, the description and the author of `app:ts`. Each value is answered by
the first of these that applies:

1. `--set key=value`. An unknown key is an error that lists the available ones. Values of yes/no questions are `true` or
   `false`.
2. The default of the value, if `--yes` is given.
3. A prompt in the terminal.

Without a terminal a value that is still open is an error that points to `--set`, or to `--yes` if there is a default. A
value that is used by several of the included stamps is only asked once.

#### Existing files

When a file already exists with other content, you are asked per file: overwrite it, keep it, show a diff, or do the
same for all following files. Files with identical content are left alone and reported as `unchanged`. Nothing is
written before all files are rendered, so an error does not leave a half written project.

Without a terminal (CI, scripts) nothing is asked: the command fails before it writes anything and lists the files,
unless `--force` or `--skip-existing` is given.

`--dry-run` labels every file `create`, `unchanged`, or, if it exists with other content, `conflict`. With `--force`
such a file is labeled `overwrite` and with `--skip-existing` `keep`, as that is what the command would do.

### `list`

```bash
ts-starter list              # all stamps
ts-starter list editorconfig # the variants of one stamp
ts-starter list --json       # for scripts
```

Prints `<stamp>:<variant>`, the mode and the description. With `--json` it prints an array of
`{ "id", "name", "variant", "description", "mode" }` objects and nothing else.

### `info`

```bash
ts-starter info app:ts
```

Shows the description, the values for `--set` with their prompt and default, the stamps that are included and every file
the stamp writes. The variant is required.

### Output and exit codes

Results, `list` and `info` go to stdout. Errors, hints and prompts go to stderr, so `ts-starter list --json | jq` is
safe.

| Code  | Meaning                                                                             |
| ----- | ----------------------------------------------------------------------------------- |
| `0`   | Success                                                                             |
| `1`   | The run failed, e.g. an unknown stamp, an open value or a conflict without terminal |
| `2`   | Wrong usage of the command line                                                     |
| `130` | A prompt was interrupted (Ctrl-C), nothing was written                              |

## Available stamps

```bash
ts-starter list
```

| Stamp             | Mode      | Writes                                                                                             |
| ----------------- | --------- | -------------------------------------------------------------------------------------------------- |
| `app:ts`          | `project` | A TypeScript app: `package.json`, `README.md`, `Makefile`, `.nvmrc`, `tsconfig.json`, `.vscode/`, `src/`, plus the stamps below |
| `editorconfig:ts` | `inject`  | `.editorconfig` for TypeScript and JavaScript                                                      |
| `editorconfig:go` | `inject`  | `.editorconfig` for Go (tabs)                                                                      |
| `biome:ts`        | `inject`  | `biome.json`, the `@biomejs/biome` dependency and the Biome settings in `.vscode/`                 |
| `vitest:ts`       | `inject`  | `vitest.config.ts`                                                                                 |
| `gitignore:node`  | `inject`  | `.gitignore`                                                                                       |

`ts-starter info app:ts` shows the values a stamp asks for, the stamps it includes and the files it writes.

The generated TypeScript project uses [Vitest](https://vitest.dev) for the tests, [tsx](https://tsx.is) to run the code,
[Biome](https://biomejs.dev) for formatting and linting and a `Makefile` with the targets `build`, `test`, `start`, `clean` and `help`.

## Development

```bash
npm install
npm test                # unit tests
npm run format:check    # biome, also `npm run format`
npm run check           # biome check --write
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
- `npm` lists the npm packages the stamp needs, as `devDependencies` and/or `dependencies` (name to version range).
  The prefix leaves room for other package managers later, e.g. `go`.
- `patches` lists changes to JSON files that other stamps or the user own, as `{ "file": ..., "merge": {...} }`.

```json
{
  "npm": { "devDependencies": { "@biomejs/biome": "2.6.4" } },
  "patches": [
    { "file": ".vscode/extensions.json", "merge": { "recommendations": ["biomejs.biome"] } },
    { "file": ".vscode/settings.json", "merge": { "editor.defaultFormatter": "biomejs.biome" } }
  ]
}
```

`npm` and patches work on the file of the same name that another stamp renders, otherwise on the file in the
target directory, otherwise a new file is created. Objects are merged, arrays get the missing values added and any other
value is replaced by the value of the patch. A package that is already in `dependencies` or `devDependencies` is not
touched. Replaced values and kept packages are shown as `hint:` lines. A file the patch only merges into is written
without asking (`patch` in the output) and nothing is changed when the patch has no effect. Only JSON files can be
patched.

Names and variants may only contain lower case letters, digits and `-`. A new stamp shows up in `list` without further
changes.

## Releases

Releases are made with semantic-release from conventional commits. The commit message decides the next version, a
`BREAKING CHANGE:` footer or a `!` after the type makes a major release.

---

Created by Yves Kaufmann
