import { stat } from 'node:fs/promises';
import path from 'node:path';

import { kebabCase } from 'change-case';

import { StampError } from './errors.js';

/**
 * Answers that follow from the target argument: a project is named by it, `.` takes the name of the current folder.
 * @param {import('./registry.js').Stamp} stamp
 * @param {string | undefined} target
 * @param {string} cwd
 * @returns {Record<string, string>}
 */
export function targetAnswers(stamp, target, cwd) {
  if (stamp.mode !== 'project' || target === undefined) {
    return {};
  }
  if (target === '.') {
    return { name: path.basename(path.resolve(cwd)) };
  }
  if (/[\\/]/.test(target) || target === '..') {
    throw new StampError(`"${target}" is not a project name, use a name or "." for the current directory`);
  }
  return { name: target };
}

/**
 * The directory the files are written to.
 * @param {import('./registry.js').Stamp} stamp
 * @param {string | undefined} target
 * @param {Record<string, string | boolean>} answers
 * @param {string} cwd
 * @returns {Promise<string>}
 */
export async function resolveTargetDir(stamp, target, answers, cwd) {
  if (stamp.mode === 'project') {
    if (target === '.') {
      return path.resolve(cwd);
    }
    const name = kebabCase(String(answers.name));
    if (name === '') {
      throw new StampError(`"${answers.name}" is not a usable project name`);
    }
    return path.resolve(cwd, name);
  }

  if (target === undefined || target === '.') {
    return path.resolve(cwd);
  }
  const dir = path.resolve(cwd, target);
  const stats = await stat(dir).catch(() => undefined);
  if (!stats?.isDirectory()) {
    throw new StampError(`The directory ${dir} does not exist, ${stamp.id} can only be added to an existing directory`);
  }
  return dir;
}
