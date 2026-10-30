import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseArguments } from './args.js';
import { complete } from './commands/complete.js';
import { completion } from './commands/completion.js';
import { create } from './commands/create.js';
import { info } from './commands/info.js';
import { list } from './commands/list.js';
import { UsageError } from './errors.js';
import { loadRegistry, StampError } from './stamps/index.js';
import { createTerminalUi } from './ui.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export const EXIT = { ok: 0, failure: 1, usage: 2, interrupted: 130 };

const HANDLERS = { create, list, info, completion };

export const USAGE = `Usage: ts-starter <command> [options]

Commands:
  create <stamp>[:<variant>] [target]   Create a project or add a stamp to a directory
  list [stamp]                          List the available stamps and variants
  info <stamp>:<variant>                Show what a stamp asks for and writes
  completion <bash|zsh>                 Print the tab completion script of a shell

Options of create:
  --set key=value     Answer a prompt without asking, can be repeated
  -y, --yes           Use the defaults of all prompts that have one
  --dry-run           Show the files that would be written and stop
  --force             Overwrite existing files without asking
  --skip-existing     Keep existing files without asking

Options of list:
  --json              Print the stamps as JSON

General:
  -h, --help          Show this help
  -v, --version       Show the version

Examples:
  ts-starter create app:ts                 Ask for the project name
  ts-starter create app:ts demo            Create ./demo
  ts-starter create app:ts .               Use the current directory
  ts-starter create editorconfig:ts        Add an .editorconfig to the current directory
`;

async function readVersion() {
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  return pkg.version;
}

/**
 * Run the command line and return the exit code, nothing in here exits the process.
 *
 * @param {string[]} argv arguments without node and the script
 * @param {object} [env]
 * @param {string} [env.cwd]
 * @param {{ write(text: string): unknown }} [env.stdout]
 * @param {{ write(text: string): unknown }} [env.stderr]
 * @param {boolean} [env.interactive] whether prompts can be shown
 * @param {object} [env.ui] prompt implementation, defaults to the terminal
 * @param {string} [env.stampsDir]
 * @returns {Promise<number>}
 */
export async function main(argv, env = {}) {
  const full = {
    cwd: process.cwd(),
    stdout: process.stdout,
    stderr: process.stderr,
    interactive: Boolean(process.stdin.isTTY && process.stderr.isTTY),
    stampsDir: path.join(root, 'stamps'),
    ...env,
  };
  full.ui ??= createTerminalUi();

  // Hidden command of the completion scripts, its words look like options and must not be parsed
  if (argv[0] === '__complete') {
    return complete(argv.slice(1), full);
  }

  try {
    const parsed = parseArguments(argv);

    if (parsed.version) {
      full.stdout.write(`${await readVersion()}\n`);
      return EXIT.ok;
    }
    if (parsed.help || parsed.command === undefined) {
      (parsed.help ? full.stdout : full.stderr).write(USAGE);
      return parsed.help ? EXIT.ok : EXIT.usage;
    }

    const registry = parsed.command === 'completion' ? undefined : await loadRegistry(full.stampsDir);
    return await HANDLERS[parsed.command]({
      positionals: parsed.positionals,
      options: parsed.options,
      registry,
      env: full,
    });
  } catch (error) {
    if (error instanceof UsageError) {
      full.stderr.write(`Error: ${error.message}\nRun "ts-starter --help" for the usage.\n`);
      return EXIT.usage;
    }
    if (error.name === 'ExitPromptError') {
      full.stderr.write('\nAborted, nothing was written.\n');
      return EXIT.interrupted;
    }
    if (error instanceof StampError) {
      full.stderr.write(`Error: ${error.message}\n`);
      return EXIT.failure;
    }
    full.stderr.write(`Unexpected error: ${process.env.DEBUG ? error.stack : error.message}\n`);
    return EXIT.failure;
  }
}
