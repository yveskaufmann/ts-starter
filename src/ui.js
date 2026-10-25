import { createPatch } from 'diff';

/**
 * Prompts for a terminal. The prompt library is loaded on first use, so commands that do not ask anything start fast.
 * Prompts are shown on stderr to keep stdout free for data.
 */
export function createTerminalUi({ stdin = process.stdin, stderr = process.stderr } = {}) {
  const context = { input: stdin, output: stderr };
  const library = () => import('@inquirer/prompts');

  return {
    /** @param {import('./stamps/registry.js').Prompt} prompt */
    async ask(prompt) {
      const { input, confirm } = await library();
      if (prompt.type === 'confirm') {
        return confirm({ message: prompt.message, default: prompt.default }, context);
      }
      return input(
        {
          message: prompt.message,
          default: prompt.default,
          validate: (value) => value.trim() !== '' || 'A value is required',
        },
        context,
      );
    },

    async askVariant(name, variants) {
      const { select } = await library();
      return select({ message: `Which variant of ${name}?`, choices: variants.map((value) => ({ value })) }, context);
    },

    /** @param {import('./stamps/write.js').PlanEntry} entry */
    async askConflict(entry) {
      const { select } = await library();
      const choices = [
        { name: 'Overwrite', value: 'overwrite' },
        { name: 'Skip', value: 'skip' },
        { name: 'Show diff', value: 'diff' },
        { name: 'Overwrite this and all following files', value: 'overwrite-all' },
        { name: 'Skip this and all following files', value: 'skip-all' },
      ];
      for (;;) {
        const answer = await select({ message: `${entry.path} already exists`, choices }, context);
        if (answer !== 'diff') {
          return answer;
        }
        stderr.write(
          `${createPatch(entry.path, entry.existing.toString('utf8'), entry.content.toString('utf8'), 'existing', 'new')}\n`,
        );
      }
    },
  };
}
