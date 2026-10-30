import { chmod, lstat, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { StampError } from './errors.js';

/**
 * @typedef {object} PlanEntry
 * @property {string} path Relative path with "/" as separator
 * @property {Buffer} content
 * @property {number} mode
 * @property {string} stamp
 * @property {boolean} [patched] Merged into the file already in the target, so it is written without asking
 * @property {'new' | 'identical' | 'patched' | 'conflict'} status
 * @property {Buffer} [existing] Content of the existing file when the status is `conflict`
 * @property {'write' | 'skip'} action Set by `resolveConflicts`, `new` entries are written and `identical` ones skipped
 */

function insideTarget(targetDir, relativePath) {
  const full = path.resolve(targetDir, relativePath);
  if (full !== targetDir && !full.startsWith(targetDir + path.sep)) {
    throw new StampError(`Refusing to write "${relativePath}" outside of ${targetDir}`);
  }
  return full;
}

/**
 * Compare the rendered files with the target directory, which does not need to exist yet.
 * @param {import('./render.js').RenderedFile[]} files
 * @returns {Promise<PlanEntry[]>}
 */
export async function planWrites(files, targetDir) {
  const root = path.resolve(targetDir);
  const plan = [];

  for (const file of files) {
    const full = insideTarget(root, file.path);
    let stats;
    try {
      stats = await lstat(full);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
        plan.push({ ...file, status: 'new', action: 'write' });
        continue;
      }
      throw error;
    }

    if (!stats.isFile()) {
      throw new StampError(`Cannot write ${file.path}: ${full} exists and is not a regular file`);
    }
    const existing = await readFile(full);
    if (existing.equals(file.content)) {
      plan.push({ ...file, status: 'identical', action: 'skip' });
    } else if (file.patched) {
      plan.push({ ...file, status: 'patched', existing, action: 'write' });
    } else {
      plan.push({ ...file, status: 'conflict', existing, action: 'write' });
    }
  }
  return plan;
}

/**
 * Decide what happens with the files that already exist with other content.
 *
 * @param {PlanEntry[]} plan
 * @param {object} options
 * @param {'force' | 'skip'} [options.strategy] `force` overwrites and `skip` keeps all existing files
 * @param {(entry: PlanEntry) => Promise<'overwrite' | 'skip' | 'overwrite-all' | 'skip-all'>} [options.ask]
 *   asked per conflict when there is no strategy, absent without a terminal
 * @returns {Promise<PlanEntry[]>} a new plan with the `action` of every entry set
 */
export async function resolveConflicts(plan, { strategy, ask } = {}) {
  const conflicts = plan.filter((entry) => entry.status === 'conflict');
  if (conflicts.length > 0 && !strategy && !ask) {
    throw new StampError(
      `These files already exist: ${conflicts.map((entry) => entry.path).join(', ')}. ` +
        'Nothing was written, use --force to overwrite them or --skip-existing to keep them',
    );
  }

  let remembered = strategy === 'force' ? 'overwrite' : strategy === 'skip' ? 'skip' : undefined;
  const resolved = [];
  for (const entry of plan) {
    if (entry.status !== 'conflict') {
      resolved.push(entry);
      continue;
    }

    let answer = remembered;
    if (!answer) {
      answer = await ask(entry);
      if (answer === 'overwrite-all' || answer === 'skip-all') {
        answer = remembered = answer === 'overwrite-all' ? 'overwrite' : 'skip';
      }
    }
    resolved.push({ ...entry, action: answer === 'overwrite' ? 'write' : 'skip' });
  }
  return resolved;
}

/**
 * Write the entries whose action is `write`. A target directory that did not exist before is removed again on failure.
 * @param {PlanEntry[]} plan
 * @returns {Promise<{ written: string[], skipped: string[] }>} relative paths
 */
export async function writePlan(plan, targetDir) {
  const root = path.resolve(targetDir);
  const existed = await lstat(root).then(
    () => true,
    () => false,
  );

  const written = [];
  try {
    for (const entry of plan.filter((candidate) => candidate.action === 'write')) {
      const full = insideTarget(root, entry.path);
      await mkdir(path.dirname(full), { recursive: true });
      await writeFile(full, entry.content);
      await chmod(full, entry.mode & 0o777);
      written.push(entry.path);
    }
  } catch (error) {
    if (!existed) {
      await rm(root, { recursive: true, force: true });
    }
    throw error;
  }

  return {
    written,
    skipped: plan.filter((entry) => entry.action === 'skip').map((entry) => entry.path),
  };
}
