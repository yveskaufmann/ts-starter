# AGENTS.md

## Goal

`@yveskaufmann/ts-starter` is a personal project starter, published to npm. It saves setting up the same things over and
over: one CLI creates a new TypeScript project, or adds a small piece (an `.editorconfig`, a Prettier config, ...) to an
existing one.

Everything is a **stamp**: a directory `stamps/<name>/<variant>/` with a `stamp.json` and the files it writes. An app
(`app:ts`) is a stamp that includes other stamps. The generated project has to work out of the box (format, build,
test).

Details: [README.md](README.md) for usage, [docs/cli-design.md](docs/cli-design.md) for design and decisions.

## Commands

```bash
npm ci
npm test                # vitest
npm run format:check    # biome, also `npm run format`
npm run check           # biome check --write
node index.js create app:ts demo --yes
```

Plain ESM JavaScript on Node 22+, no build step. Both checks must pass.

## Structure

- `src/cli.js`, `src/commands/`: command line, input and output only
- `src/stamps/`: the generator core (load, prompts, render, write). It knows nothing about the terminal.
- `stamps/`: the shipped stamps
- Tests are `*.spec.js` next to the code. The snapshot in `src/__snapshots__/` records what `app:ts` generates, update
  it with `npx vitest run -u` and review the diff.

## Conventions

- Results go to stdout, errors and prompts to stderr. Exit codes: `0` ok, `1` failed, `2` usage, `130` interrupted.
- Never write half a project: render and resolve conflicts first. Without a terminal, fail instead of prompting.
- No new dependencies without a reason. Do not reintroduce plop.
- Behavior shown to users is documented in the README. Change both together.

## Workflow

- **Ask before committing, pushing or opening a PR.**
- Conventional Commits (`feat(cli): ...`, `fix(stamps): ...`). semantic-release publishes from `main` and the type
  decides the version.
- PRs target `main`. The PR description has a Summary and a Test plan with what was actually run.
