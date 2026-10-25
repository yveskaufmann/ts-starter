import { StampError } from './errors.js';

/**
 * Merge the prompts of the given stamps. A prompt keeps the position where it first appeared,
 * but the definition of the stamp listed last wins, so a stamp can refine the prompts of its includes.
 * @param {import('./registry.js').Stamp[]} stamps ordered like `Registry.flatten`
 * @returns {import('./registry.js').Prompt[]}
 */
export function collectPrompts(stamps) {
  const prompts = new Map();
  for (const stamp of stamps) {
    for (const prompt of stamp.prompts) {
      prompts.set(prompt.name, prompt);
    }
  }
  return [...prompts.values()];
}

function parseSetValue(prompt, raw) {
  if (prompt.type !== 'confirm') {
    return raw;
  }
  if (raw === 'true' || raw === 'false') {
    return raw === 'true';
  }
  throw new StampError(`The value of "${prompt.name}" must be true or false, got "${raw}"`);
}

/**
 * Answer prompts without a user interface first (`set`, then the defaults when `yes`) and ask for the rest.
 *
 * @param {import('./registry.js').Prompt[]} prompts
 * @param {object} options
 * @param {Record<string, string>} [options.set] answers given on the command line
 * @param {boolean} [options.yes] accept defaults instead of asking
 * @param {(prompt: import('./registry.js').Prompt) => Promise<string | boolean>} [options.ask] absent without a terminal
 * @returns {Promise<Record<string, string | boolean>>}
 */
export async function answerPrompts(prompts, { set = {}, yes = false, ask } = {}) {
  const known = new Set(prompts.map((prompt) => prompt.name));
  const unknown = Object.keys(set).filter((key) => !known.has(key));
  if (unknown.length > 0) {
    throw new StampError(
      `Unknown value${unknown.length > 1 ? 's' : ''} ${unknown.map((key) => `"${key}"`).join(', ')}. ` +
        `Available: ${[...known].join(', ') || 'none'}`,
    );
  }

  const answers = {};
  for (const prompt of prompts) {
    if (prompt.name in set) {
      answers[prompt.name] = parseSetValue(prompt, set[prompt.name]);
    } else if (yes && prompt.default !== undefined) {
      answers[prompt.name] = prompt.default;
    } else if (ask) {
      answers[prompt.name] = await ask(prompt);
    } else {
      throw new StampError(
        `No value for "${prompt.name}" (${prompt.message}). Pass --set ${prompt.name}=<value>` +
          (prompt.default === undefined ? '' : ' or --yes to use the default'),
      );
    }
  }
  return answers;
}
