/**
 * Suggestions for the hidden `ts-starter __complete <words...>` command, which the completion scripts call.
 *
 * `words` are the arguments typed after `ts-starter`, the last one is the word under the cursor and may be empty.
 * The result only contains suggestions that start with that word. A final `:files` line asks the shell to
 * complete file names instead of, or in addition to, the suggestions.
 */

export const FILES_DIRECTIVE = ':files';
export const SHELLS = ['bash', 'zsh'];

const COMMANDS = ['create', 'list', 'info', 'completion'];
const GLOBAL_OPTIONS = ['--help', '--version'];

const COMMAND_OPTIONS = {
  create: ['--set', '--yes', '--dry-run', '--force', '--skip-existing', '--help'],
  list: ['--json', '--help'],
  info: ['--help'],
  completion: ['--help'],
};

/** Options that take a value, the value is the next word. */
const VALUE_OPTIONS = new Set(['--set']);

function startingWith(values, prefix) {
  return values.filter((value) => value.startsWith(prefix));
}

function stampIds(registry) {
  return registry.all().map((stamp) => stamp.id);
}

/** The words before the current one, split into positional arguments and options. */
function splitArguments(previous) {
  const positionals = [];
  const options = [];
  for (let index = 0; index < previous.length; index += 1) {
    const word = previous[index];
    if (word.startsWith('-')) {
      options.push(word);
      if (VALUE_OPTIONS.has(word)) {
        index += 1;
      }
    } else {
      positionals.push(word);
    }
  }
  return { positionals, options };
}

/** `name=` for every prompt of the stamp that is being created, if it is already complete. */
function setKeys(registry, spec) {
  const [name, variant] = (spec ?? '').split(':');
  const stamp = variant && registry.find(name, variant);
  if (!stamp) {
    return [];
  }
  const names = new Set(registry.flatten(stamp).flatMap((included) => included.prompts.map((prompt) => prompt.name)));
  return [...names].sort().map((key) => `${key}=`);
}

/**
 * @param {string[]} words
 * @param {import('../stamps/registry.js').Registry} registry
 * @returns {string[]} suggestions, one per entry
 */
export function complete(words, registry) {
  if (words.length === 0) {
    return [];
  }
  const current = words[words.length - 1];
  const previous = words.slice(0, -1);

  if (previous.length === 0) {
    return startingWith(current.startsWith('-') ? GLOBAL_OPTIONS : COMMANDS, current);
  }

  const [command, ...rest] = previous;
  if (!COMMANDS.includes(command)) {
    return [];
  }

  if (rest.at(-1) === '--set' && command === 'create') {
    const { positionals } = splitArguments(rest);
    return startingWith(setKeys(registry, positionals[0]), current);
  }

  const { positionals, options } = splitArguments(rest);
  if (current.startsWith('-')) {
    const unused = COMMAND_OPTIONS[command].filter((option) => VALUE_OPTIONS.has(option) || !options.includes(option));
    return startingWith(unused, current);
  }

  const position = positionals.length;
  switch (command) {
    case 'create':
      if (position === 0) {
        return startingWith(stampIds(registry), current);
      }
      return position === 1 ? [FILES_DIRECTIVE] : [];
    case 'info':
      return position === 0 ? startingWith(stampIds(registry), current) : [];
    case 'list':
      return position === 0 ? startingWith(registry.names(), current) : [];
    case 'completion':
      return position === 0 ? startingWith(SHELLS, current) : [];
    default:
      return [];
  }
}
