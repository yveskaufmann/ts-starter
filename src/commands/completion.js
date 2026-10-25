import { readFile } from 'node:fs/promises';

import { SHELLS } from '../completion/complete.js';
import { UsageError } from '../errors.js';

/**
 * ts-starter completion <shell>
 * @returns {Promise<number>} exit code
 */
export async function completion({ positionals, env }) {
  const [shell] = positionals;
  if (!shell) {
    throw new UsageError(`Missing shell, use one of: ${SHELLS.join(', ')}`);
  }
  if (!SHELLS.includes(shell)) {
    throw new UsageError(`Unsupported shell "${shell}", use one of: ${SHELLS.join(', ')}`);
  }

  env.stdout.write(await readFile(new URL(`../completion/${shell}.sh`, import.meta.url), 'utf8'));
  return 0;
}
