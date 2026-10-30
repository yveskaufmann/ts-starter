import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { StampError } from './errors.js';

const DEPENDENCY_SECTIONS = ['dependencies', 'devDependencies'];
const LINE_WIDTH = 120;

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPrimitive(value) {
  return value === null || typeof value !== 'object';
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Merge `patch` into `base`: objects are merged recursively, arrays get the missing values appended and everything else
 * is replaced by the patch value. Every replaced value is reported in `hints`.
 */
function merge(base, patch, location, hints) {
  if (isObject(base) && isObject(patch)) {
    const result = { ...base };
    for (const [key, value] of Object.entries(patch)) {
      result[key] = key in base ? merge(base[key], value, [...location, key], hints) : value;
    }
    return result;
  }
  if (Array.isArray(base) && Array.isArray(patch)) {
    return [...base, ...patch.filter((value) => !base.some((existing) => same(existing, value)))];
  }
  if (!same(base, patch)) {
    hints.push(`${location.join('.')} was ${JSON.stringify(base)}, set to ${JSON.stringify(patch)}`);
  }
  return patch;
}

/** Add the packages that are missing in package.json. Packages that are already there keep their version. */
function addDependencies(manifest, dependencies, hints) {
  const result = { ...manifest };
  for (const section of DEPENDENCY_SECTIONS) {
    const additions = dependencies[section] ?? {};
    const added = { ...result[section] };
    let changed = false;
    for (const [name, range] of Object.entries(additions)) {
      const current = DEPENDENCY_SECTIONS.map((candidate) => manifest[candidate]?.[name]).find(Boolean);
      if (current) {
        hints.push(`${name} is already a dependency (${current}), not changed`);
      } else {
        added[name] = range;
        changed = true;
      }
    }
    if (changed) {
      result[section] = Object.fromEntries(Object.entries(added).sort(([a], [b]) => a.localeCompare(b)));
    }
  }
  return result;
}

/** JSON with 2 spaces where arrays of simple values stay on one line when they fit, like the formatter writes them. */
export function stringify(value, indent = '') {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    const inline = `[${value.map((item) => JSON.stringify(item)).join(', ')}]`;
    if (value.every(isPrimitive) && indent.length + inline.length + 2 <= LINE_WIDTH) {
      return inline;
    }
    const inner = `${indent}  `;
    return `[\n${value.map((item) => inner + stringify(item, inner)).join(',\n')}\n${indent}]`;
  }
  if (isObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return '{}';
    }
    const inner = `${indent}  `;
    return `{\n${entries.map(([key, item]) => `${inner}${JSON.stringify(key)}: ${stringify(item, inner)}`).join(',\n')}\n${indent}}`;
  }
  return JSON.stringify(value);
}

async function readTarget(targetDir, file) {
  try {
    return await readFile(path.resolve(targetDir, file), 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      return undefined;
    }
    throw error;
  }
}

/**
 * Collect the npm packages and patches of the stamps as one list of operations per file, in stamp order.
 * @param {import('./registry.js').Stamp[]} stamps
 */
function operations(stamps) {
  /** @type {Map<string, Array<{ stamp: string, npm?: object, merge?: object }>>} */
  const byFile = new Map();
  const add = (file, operation) => byFile.set(file, [...(byFile.get(file) ?? []), operation]);

  for (const stamp of stamps) {
    if (Object.keys(stamp.npm).length > 0) {
      add('package.json', { stamp: stamp.id, npm: stamp.npm });
    }
    for (const patch of stamp.patches) {
      add(patch.file, { stamp: stamp.id, merge: patch.merge });
    }
  }
  return byFile;
}

/**
 * Apply the dependencies and patches of the stamps to the rendered files. A file that is patched starts from the
 * rendered file, else from the file in the target directory, else from an empty object.
 *
 * @param {import('./render.js').RenderedFile[]} files
 * @param {import('./registry.js').Stamp[]} stamps ordered like `Registry.flatten`
 * @param {string} targetDir
 * @returns {Promise<{ files: import('./render.js').RenderedFile[], hints: string[] }>} files ordered by path
 */
export async function applyPatches(files, stamps, targetDir) {
  const result = new Map(files.map((file) => [file.path, file]));
  const hints = [];

  for (const [file, steps] of operations(stamps)) {
    const rendered = result.get(file);
    const source = rendered ? rendered.content.toString('utf8') : await readTarget(targetDir, file);

    let content = {};
    let original;
    if (source !== undefined) {
      try {
        content = JSON.parse(source);
      } catch (error) {
        throw new StampError(`Cannot patch ${file}: it is not valid JSON (${error.message})`);
      }
      if (!isObject(content)) {
        throw new StampError(`Cannot patch ${file}: it does not contain a JSON object`);
      }
      original = content;
    }

    for (const step of steps) {
      const found = [];
      content = step.npm ? addDependencies(content, step.npm, found) : merge(content, step.merge, [], found);
      hints.push(...found.map((hint) => `${file}: ${hint} (${step.stamp})`));
    }

    result.set(file, {
      path: file,
      // A patch that changes nothing keeps the file byte for byte
      content: Buffer.from(same(content, original) ? source : `${stringify(content)}\n`),
      mode: rendered?.mode ?? 0o644,
      stamp: rendered?.stamp ?? steps[0].stamp,
      patched: !rendered && source !== undefined,
    });
  }

  return { files: [...result.values()].sort((a, b) => a.path.localeCompare(b.path)), hints };
}
