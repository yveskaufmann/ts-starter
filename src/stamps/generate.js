import { StampError } from './errors.js';
import { applyPatches } from './patch.js';
import { answerPrompts, collectPrompts } from './prompts.js';
import { renderStamps } from './render.js';
import { resolveTargetDir, targetAnswers } from './target.js';
import { planWrites } from './write.js';

/**
 * Everything up to the point where files would be written: resolve includes, answer the prompts, find the target
 * directory, render the files in memory, apply the patches and compare them with the target. Nothing is written.
 *
 * @param {object} options
 * @param {import('./registry.js').Registry} options.registry
 * @param {import('./registry.js').Stamp} options.stamp
 * @param {string} [options.target] the target argument of the command line
 * @param {string} options.cwd
 * @param {Record<string, string>} [options.set]
 * @param {boolean} [options.yes]
 * @param {(prompt: import('./registry.js').Prompt) => Promise<string | boolean>} [options.ask]
 */
export async function prepareRun({ registry, stamp, target, cwd, set = {}, yes = false, ask }) {
  const stamps = registry.flatten(stamp);

  const fromTarget = targetAnswers(stamp, target, cwd);
  if ('name' in fromTarget && set.name !== undefined && set.name !== fromTarget.name) {
    throw new StampError(`The name "${fromTarget.name}" of the target and --set name=${set.name} do not match`);
  }

  const answers = await answerPrompts(collectPrompts(stamps), { set: { ...set, ...fromTarget }, yes, ask });
  const targetDir = await resolveTargetDir(stamp, target, answers, cwd);
  const rendered = await renderStamps(stamps, answers);
  const { files, hints } = await applyPatches(rendered, stamps, targetDir);
  const plan = await planWrites(files, targetDir);

  return { stamps, answers, targetDir, files, hints, plan };
}
