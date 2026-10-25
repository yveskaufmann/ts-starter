import { complete as suggest } from '../completion/complete.js';
import { loadRegistry } from '../stamps/index.js';

/**
 * Hidden command used by the completion scripts: ts-starter __complete <words...>
 * It prints suggestions only and never fails, a broken stamp or any other problem results in no suggestions.
 * @returns {Promise<number>} exit code
 */
export async function complete(words, env) {
  try {
    const registry = await loadRegistry(env.stampsDir);
    for (const suggestion of suggest(words, registry)) {
      env.stdout.write(`${suggestion}\n`);
    }
  } catch {
    // nothing to suggest
  }
  return 0;
}
