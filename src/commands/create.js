import path from 'node:path';

import { UsageError } from '../errors.js';
import { parseStampId, prepareRun, resolveConflicts, StampError, writePlan } from '../stamps/index.js';

const LABELS = { new: 'create', identical: 'unchanged', patched: 'patch' };

async function chooseVariant(registry, name, { interactive, ui }) {
  const variants = registry.variants(name);
  if (variants.length === 0) {
    throw new StampError(`Unknown stamp "${name}". Available stamps: ${registry.names().join(', ') || 'none'}`);
  }
  if (!interactive) {
    throw new StampError(
      `Missing variant for "${name}", use ${variants.map((variant) => `${name}:${variant}`).join(' or ')}`,
    );
  }
  return ui.askVariant(name, variants);
}

/** @param {boolean} resolved whether the conflicts were decided, otherwise they are only reported */
function printPlan(plan, stdout, resolved) {
  for (const entry of plan) {
    let label = LABELS[entry.status];
    if (entry.status === 'conflict') {
      label = !resolved ? 'conflict' : entry.action === 'skip' ? 'keep' : 'overwrite';
    }
    stdout.write(`  ${label.padEnd(9)} ${entry.path}\n`);
  }
}

function printHints(hints, stdout) {
  for (const hint of hints) {
    stdout.write(`hint: ${hint}\n`);
  }
}

/**
 * ts-starter create <stamp>[:<variant>] [target]
 * @returns {Promise<number>} exit code
 */
export async function create({ positionals, options, registry, env }) {
  const [spec, target] = positionals;
  if (!spec) {
    throw new UsageError('Missing stamp, for example: ts-starter create app:ts');
  }

  const { name, variant: given } = parseStampId(spec);
  const variant = given ?? (await chooseVariant(registry, name, env));
  const stamp = registry.get(name, variant);

  const { plan, targetDir, hints } = await prepareRun({
    registry,
    stamp,
    target,
    cwd: env.cwd,
    set: options.set,
    yes: options.yes,
    ask: env.interactive ? (prompt) => env.ui.ask(prompt) : undefined,
  });
  const shown = path.relative(env.cwd, targetDir) || '.';

  const strategy = options.force ? 'force' : options.skipExisting ? 'skip' : undefined;

  if (options.dryRun) {
    env.stdout.write(`Dry run, nothing is written. ${stamp.id} would change ${shown}:\n`);
    printPlan(strategy ? await resolveConflicts(plan, { strategy }) : plan, env.stdout, Boolean(strategy));
    printHints(hints, env.stdout);
    return 0;
  }

  const resolved = await resolveConflicts(plan, {
    strategy,
    ask: env.interactive ? (entry) => env.ui.askConflict(entry) : undefined,
  });
  const { written, skipped } = await writePlan(resolved, targetDir);

  env.stdout.write(`${stamp.id}: wrote ${written.length} file${written.length === 1 ? '' : 's'} to ${shown}\n`);
  printPlan(resolved, env.stdout, true);
  if (skipped.length > 0) {
    const kept = resolved.filter((entry) => entry.action === 'skip' && entry.status === 'conflict').length;
    env.stdout.write(`${skipped.length} skipped${kept > 0 ? `, ${kept} kept with their own content` : ''}\n`);
  }
  printHints(hints, env.stdout);
  if (stamp.mode === 'project' && shown !== '.') {
    env.stdout.write(`\nNext: cd ${shown}\n`);
  }
  return 0;
}
