import { parseArgs } from 'node:util';

import { UsageError } from './errors.js';

export const COMMANDS = ['create', 'list', 'info'];

const options = {
  'force': { type: 'boolean' },
  'skip-existing': { type: 'boolean' },
  'dry-run': { type: 'boolean' },
  'yes': { type: 'boolean', short: 'y' },
  'set': { type: 'string', multiple: true },
  'json': { type: 'boolean' },
  'help': { type: 'boolean', short: 'h' },
  'version': { type: 'boolean', short: 'v' },
};

/** Which options a command accepts besides --help. */
const COMMAND_OPTIONS = {
  create: ['force', 'skip-existing', 'dry-run', 'yes', 'set'],
  list: ['json'],
  info: [],
};

const MAX_POSITIONALS = { create: 2, list: 1, info: 1 };

function parseSet(values = []) {
  const set = {};
  for (const value of values) {
    const index = value.indexOf('=');
    if (index < 1) {
      throw new UsageError(`Invalid --set value "${value}", expected key=value`);
    }
    set[value.slice(0, index)] = value.slice(index + 1);
  }
  return set;
}

/**
 * Parse the command line (without node and the script).
 * @param {string[]} argv
 * @returns {{ command?: string, positionals: string[], help: boolean, version: boolean, options: object }}
 */
export function parseArguments(argv) {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, options, allowPositionals: true, strict: true });
  } catch (error) {
    throw new UsageError(error.message.split('. To specify')[0]);
  }

  const { values } = parsed;
  const [command, ...positionals] = parsed.positionals;
  const result = { command, positionals, help: Boolean(values.help), version: Boolean(values.version), options: {} };

  if (command === undefined || result.help || result.version) {
    return result;
  }
  if (!COMMANDS.includes(command)) {
    throw new UsageError(`Unknown command "${command}". Available commands: ${COMMANDS.join(', ')}`);
  }

  const allowed = new Set([...COMMAND_OPTIONS[command], 'help', 'version']);
  for (const name of Object.keys(values)) {
    if (!allowed.has(name)) {
      throw new UsageError(`The option --${name} is not supported by "${command}"`);
    }
  }
  if (positionals.length > MAX_POSITIONALS[command]) {
    throw new UsageError(`Unexpected argument "${positionals[MAX_POSITIONALS[command]]}"`);
  }
  if (values.force && values['skip-existing']) {
    throw new UsageError('--force and --skip-existing cannot be combined');
  }

  result.options = {
    force: Boolean(values.force),
    skipExisting: Boolean(values['skip-existing']),
    dryRun: Boolean(values['dry-run']),
    yes: Boolean(values.yes),
    json: Boolean(values.json),
    set: parseSet(values.set),
  };
  return result;
}
