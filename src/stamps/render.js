import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { camelCase, kebabCase, pascalCase, snakeCase } from 'change-case';
import Handlebars from 'handlebars';

import { StampError } from './errors.js';

const TEMPLATE_EXTENSION = '.hbs';

const helpers = {
  dashCase: kebabCase,
  camelCase,
  pascalCase,
  snakeCase,
  upperCase: (value) => String(value).toUpperCase(),
  lowerCase: (value) => String(value).toLowerCase(),
};

const handlebars = Handlebars.create();
for (const [name, helper] of Object.entries(helpers)) {
  handlebars.registerHelper(name, helper);
}

/**
 * @typedef {object} RenderedFile
 * @property {string} path Relative path with "/" as separator
 * @property {Buffer} content
 * @property {number} mode File mode of the source file
 * @property {string} stamp Id of the stamp that provided the file
 */

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

async function exists(dir) {
  try {
    return (await stat(dir)).isDirectory();
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

function renderTemplate(source, answers, file, stampId) {
  try {
    // The output is source code and not html, so values must not be escaped. Unknown variables are errors.
    return handlebars.compile(source, { strict: true, noEscape: true })(answers);
  } catch (error) {
    throw new StampError(`Stamp ${stampId}: cannot render ${file}: ${error.message}`);
  }
}

/**
 * Render the files of one stamp: `*.hbs` files are rendered and lose the extension, all others are copied as they are.
 * @returns {Promise<RenderedFile[]>}
 */
export async function renderStamp(stamp, answers) {
  if (!(await exists(stamp.filesDir))) {
    if (stamp.filesDeclared) {
      throw new StampError(`Stamp ${stamp.id}: the files directory ${stamp.filesDir} does not exist`);
    }
    return [];
  }

  const files = [];
  for await (const file of walk(stamp.filesDir)) {
    const relative = path.relative(stamp.filesDir, file).split(path.sep).join('/');
    const [content, { mode }] = await Promise.all([readFile(file), stat(file)]);

    if (relative.endsWith(TEMPLATE_EXTENSION)) {
      const rendered = renderTemplate(content.toString('utf8'), answers, relative, stamp.id);
      files.push({
        path: relative.slice(0, -TEMPLATE_EXTENSION.length),
        content: Buffer.from(rendered),
        mode,
        stamp: stamp.id,
      });
    } else {
      files.push({ path: relative, content, mode, stamp: stamp.id });
    }
  }
  return files;
}

/**
 * Render all stamps in order. When several stamps provide the same path the later stamp wins.
 * @param {import('./registry.js').Stamp[]} stamps ordered like `Registry.flatten`
 * @returns {Promise<RenderedFile[]>} ordered by path
 */
export async function renderStamps(stamps, answers) {
  const files = new Map();
  for (const stamp of stamps) {
    for (const file of await renderStamp(stamp, answers)) {
      files.set(file.path, file);
    }
  }
  return [...files.values()].sort((a, b) => a.path.localeCompare(b.path));
}
