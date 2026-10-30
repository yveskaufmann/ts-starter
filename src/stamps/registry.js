import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { StampError } from './errors.js';

const MODES = ['project', 'inject'];
const DEPENDENCY_SECTIONS = ['dependencies', 'devDependencies'];
const PROMPT_TYPES = ['input', 'confirm'];
const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/**
 * @typedef {object} Prompt
 * @property {string} name
 * @property {string} message
 * @property {'input' | 'confirm'} type
 * @property {string | boolean} [default]
 */

/**
 * @typedef {object} Patch
 * @property {string} file Relative path of a JSON file in the target
 * @property {Record<string, unknown>} merge Values merged into the file
 */

/**
 * @typedef {object} Stamp
 * @property {string} name
 * @property {string} variant
 * @property {string} id `<name>:<variant>`
 * @property {string} description
 * @property {'project' | 'inject'} mode
 * @property {Prompt[]} prompts
 * @property {string[]} includes
 * @property {{ dependencies?: Record<string, string>, devDependencies?: Record<string, string> }} npm
 *   npm packages the stamp needs in package.json
 * @property {Patch[]} patches
 * @property {string} dir Directory of the stamp.json
 * @property {string} filesDir Directory holding the files of the stamp
 * @property {boolean} filesDeclared True when stamp.json names the files directory
 */

export function stampId(name, variant) {
  return `${name}:${variant}`;
}

/**
 * Split `<name>[:<variant>]` into its parts.
 * @returns {{ name: string, variant?: string }}
 */
export function parseStampId(value) {
  const [name, variant, ...rest] = value.split(':');
  if (!name || variant === '' || rest.length > 0) {
    throw new StampError(`Invalid stamp "${value}", expected <stamp>[:<variant>]`);
  }
  return variant === undefined ? { name } : { name, variant };
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(value, field, id) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new StampError(`Stamp ${id}: "${field}" must be a non-empty string`);
  }
  return value;
}

function validatePrompt(prompt, index, id) {
  if (!isObject(prompt)) {
    throw new StampError(`Stamp ${id}: prompts[${index}] must be an object`);
  }
  const name = requireString(prompt.name, `prompts[${index}].name`, id);
  const message = requireString(prompt.message, `prompts[${index}].message`, id);
  const type = prompt.type ?? 'input';
  if (!PROMPT_TYPES.includes(type)) {
    throw new StampError(
      `Stamp ${id}: prompt "${name}" has unknown type "${type}", expected ${PROMPT_TYPES.join(' or ')}`,
    );
  }
  const expected = type === 'confirm' ? 'boolean' : 'string';
  if (prompt.default !== undefined && typeof prompt.default !== expected) {
    throw new StampError(`Stamp ${id}: the default of prompt "${name}" must be a ${expected}`);
  }
  return { name, message, type, ...(prompt.default !== undefined && { default: prompt.default }) };
}

function isOutside(file) {
  return path.isAbsolute(file) || path.normalize(file).split(path.sep).includes('..');
}

function validateNpm(npm, id) {
  if (!isObject(npm)) {
    throw new StampError(`Stamp ${id}: "npm" must be an object`);
  }
  for (const [section, packages] of Object.entries(npm)) {
    if (!DEPENDENCY_SECTIONS.includes(section)) {
      throw new StampError(`Stamp ${id}: "npm" can only have ${DEPENDENCY_SECTIONS.join(' and ')}`);
    }
    if (!isObject(packages) || Object.values(packages).some((range) => typeof range !== 'string')) {
      throw new StampError(`Stamp ${id}: "npm.${section}" must map package names to version ranges`);
    }
  }
  return npm;
}

function validatePatches(patches, id) {
  if (!Array.isArray(patches)) {
    throw new StampError(`Stamp ${id}: "patches" must be an array`);
  }
  return patches.map((patch, index) => {
    if (!isObject(patch)) {
      throw new StampError(`Stamp ${id}: patches[${index}] must be an object`);
    }
    const file = requireString(patch.file, `patches[${index}].file`, id);
    if (isOutside(file)) {
      throw new StampError(`Stamp ${id}: patches[${index}].file must be a path inside the target`);
    }
    if (!file.endsWith('.json')) {
      throw new StampError(`Stamp ${id}: patches[${index}].file must be a .json file, only JSON can be patched`);
    }
    if (!isObject(patch.merge)) {
      throw new StampError(`Stamp ${id}: patches[${index}].merge must be an object`);
    }
    return { file: path.posix.normalize(file), merge: patch.merge };
  });
}

/**
 * Validate the content of a stamp.json and apply its defaults.
 * @returns {Omit<Stamp, 'name' | 'variant' | 'id' | 'dir' | 'filesDir'> & { files: string | undefined }}
 */
export function validateManifest(manifest, id) {
  if (!isObject(manifest)) {
    throw new StampError(`Stamp ${id}: stamp.json must contain an object`);
  }
  const description = requireString(manifest.description, 'description', id);
  if (!MODES.includes(manifest.mode)) {
    throw new StampError(`Stamp ${id}: "mode" must be ${MODES.join(' or ')}`);
  }

  const rawPrompts = manifest.prompts ?? [];
  if (!Array.isArray(rawPrompts)) {
    throw new StampError(`Stamp ${id}: "prompts" must be an array`);
  }
  const prompts = rawPrompts.map((prompt, index) => validatePrompt(prompt, index, id));
  const names = new Set();
  for (const { name } of prompts) {
    if (names.has(name)) {
      throw new StampError(`Stamp ${id}: prompt "${name}" is declared twice`);
    }
    names.add(name);
  }
  if (manifest.mode === 'project' && !names.has('name')) {
    throw new StampError(`Stamp ${id}: a project stamp needs a prompt called "name"`);
  }

  const includes = manifest.includes ?? [];
  if (!Array.isArray(includes) || includes.some((include) => typeof include !== 'string')) {
    throw new StampError(`Stamp ${id}: "includes" must be an array of strings`);
  }

  let files;
  if (manifest.files !== undefined) {
    files = requireString(manifest.files, 'files', id);
    if (isOutside(files)) {
      throw new StampError(`Stamp ${id}: "files" must be a directory inside the stamp`);
    }
  }

  const npm = validateNpm(manifest.npm ?? {}, id);
  const patches = validatePatches(manifest.patches ?? [], id);

  return { description, mode: manifest.mode, prompts, includes, npm, patches, files };
}

export class Registry {
  /** @param {Stamp[]} stamps */
  constructor(stamps) {
    /** @type {Map<string, Stamp>} */
    this.stamps = new Map(stamps.map((stamp) => [stamp.id, stamp]));
  }

  /** Names of all stamps, sorted. */
  names() {
    return [...new Set([...this.stamps.values()].map((stamp) => stamp.name))].sort();
  }

  /** Variants of a stamp, sorted. Empty when the stamp is unknown. */
  variants(name) {
    return [...this.stamps.values()]
      .filter((stamp) => stamp.name === name)
      .map((stamp) => stamp.variant)
      .sort();
  }

  /** All stamps ordered by id. */
  all() {
    return [...this.stamps.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  /** @returns {Stamp | undefined} */
  find(name, variant) {
    return this.stamps.get(stampId(name, variant));
  }

  /**
   * The stamp and everything it includes, depth first, so included stamps come before the stamps including them.
   * A stamp that is reachable more than once is only listed at its first position.
   * @returns {Stamp[]}
   */
  flatten(stamp) {
    /** @type {Stamp[]} */
    const ordered = [];
    const seen = new Set();

    const visit = (current, chain) => {
      if (chain.includes(current.id)) {
        throw new StampError(`Stamps include each other in a cycle: ${[...chain, current.id].join(' -> ')}`);
      }
      if (seen.has(current.id)) {
        return;
      }
      for (const include of current.includes) {
        const { name, variant } = parseStampId(include);
        visit(this.get(name, variant), [...chain, current.id]);
      }
      seen.add(current.id);
      ordered.push(current);
    };

    visit(stamp, []);
    return ordered;
  }

  /** @returns {Stamp} */
  get(name, variant) {
    const stamp = this.find(name, variant);
    if (stamp) {
      return stamp;
    }
    const variants = this.variants(name);
    if (variants.length === 0) {
      const known = this.names();
      throw new StampError(`Unknown stamp "${name}". Available stamps: ${known.join(', ') || 'none'}`);
    }
    throw new StampError(`Unknown variant "${variant}" of stamp "${name}". Available variants: ${variants.join(', ')}`);
  }
}

async function subdirectories(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort();
}

/**
 * Load all stamps below `<stampsDir>/<name>/<variant>/stamp.json`.
 * Fails when a stamp is invalid, includes an unknown stamp, or the includes form a cycle.
 */
export async function loadRegistry(stampsDir) {
  /** @type {Stamp[]} */
  const stamps = [];

  for (const name of await subdirectories(stampsDir)) {
    for (const variant of await subdirectories(path.join(stampsDir, name))) {
      const id = stampId(name, variant);
      if (!ID_PATTERN.test(name) || !ID_PATTERN.test(variant)) {
        throw new StampError(`Stamp ${id}: names may only contain lower case letters, digits and "-"`);
      }

      const dir = path.join(stampsDir, name, variant);
      const manifestPath = path.join(dir, 'stamp.json');
      let manifest;
      try {
        manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
      } catch (error) {
        const reason = error.code === 'ENOENT' ? 'the file is missing' : error.message;
        throw new StampError(`Stamp ${id}: cannot read ${manifestPath}: ${reason}`);
      }

      const { files, ...rest } = validateManifest(manifest, id);
      stamps.push({
        name,
        variant,
        id,
        dir,
        filesDir: path.join(dir, files ?? 'files'),
        filesDeclared: files !== undefined,
        ...rest,
      });
    }
  }

  const registry = new Registry(stamps);
  for (const stamp of registry.all()) {
    for (const include of stamp.includes) {
      const { name, variant } = parseStampId(include);
      if (!variant) {
        throw new StampError(`Stamp ${stamp.id} includes "${include}", an include needs a variant`);
      }
      const included = registry.find(name, variant);
      if (!included) {
        throw new StampError(`Stamp ${stamp.id} includes "${include}", which does not exist`);
      }
      if (included.mode !== 'inject') {
        throw new StampError(`Stamp ${stamp.id} includes "${include}", but only inject stamps can be included`);
      }
    }
  }
  for (const stamp of registry.all()) {
    registry.flatten(stamp);
  }
  return registry;
}
