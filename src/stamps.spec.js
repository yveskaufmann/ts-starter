import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, it } from 'vitest';

import { applyPatches, loadRegistry, renderStamps } from './stamps/index.js';
import { tempDir } from './stamps/test-helpers.js';

const stampsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'stamps');
const answers = { name: 'Demo App', description: 'A demo & more', author: 'Me <me@example.org>' };
const DEPENDENCY_SECTIONS = ['dependencies', 'devDependencies', 'peerDependencies'];

/**
 * The dependency versions the stamps declare in their package.json files. Dependabot bumps them, so tests compare the
 * generated project against these files instead of fixed versions.
 *
 * @param {import('./stamps/registry.js').Stamp[]} stamps
 * @returns {Promise<Record<string, string>>}
 */
async function declaredVersions(stamps) {
  /** @type {Record<string, string>} */
  const versions = {};
  for (const stamp of stamps) {
    const file = stamp.npmFile ?? path.join(stamp.filesDir, 'package.json');
    if (!existsSync(file)) {
      continue;
    }
    const manifest = JSON.parse(await readFile(file, 'utf8'));
    for (const section of DEPENDENCY_SECTIONS) {
      Object.assign(versions, manifest[section]);
    }
  }
  return versions;
}

/**
 * Replaces the dependency versions of a package.json with a placeholder, so a snapshot keeps the names but not the
 * versions.
 *
 * @param {string} content
 */
function maskVersions(content) {
  const manifest = JSON.parse(content);
  for (const section of DEPENDENCY_SECTIONS) {
    if (manifest[section]) {
      manifest[section] = Object.fromEntries(Object.keys(manifest[section]).map((name) => [name, '<version>']));
    }
  }
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

/** @type {import('./stamps/registry.js').Registry} */
let registry;

beforeAll(async () => {
  registry = await loadRegistry(stampsDir);
});

describe('shipped stamps', () => {
  it('provides the expected stamps and variants', () => {
    expect(registry.all().map((stamp) => stamp.id)).toEqual([
      'app:ts',
      'biome:ts',
      'editorconfig:go',
      'editorconfig:ts',
      'gitignore:node',
      'vitest:ts',
    ]);
  });

  it('references the stamp schema in every stamp.json', async () => {
    for (const stamp of registry.all()) {
      const { $schema } = JSON.parse(await readFile(path.join(stamp.dir, 'stamp.json'), 'utf8'));
      expect(path.resolve(stamp.dir, $schema), stamp.id).toBe(path.join(stampsDir, '..', 'stamp.schema.json'));
    }
  });

  it('describes every stamp', () => {
    for (const stamp of registry.all()) {
      expect(stamp.description, stamp.id).not.toBe('');
    }
  });

  it('renders every stamp on its own with the sample answers', async () => {
    for (const stamp of registry.all()) {
      const files = await renderStamps(registry.flatten(stamp), answers);
      expect(files.length, stamp.id).toBeGreaterThan(0);
    }
  });

  it('composes app:ts from the small stamps', () => {
    const order = registry.flatten(registry.get('app', 'ts')).map((stamp) => stamp.id);

    expect(order).toEqual(['editorconfig:ts', 'vitest:ts', 'biome:ts', 'gitignore:node', 'app:ts']);
  });

  it('renders the app:ts project', async () => {
    const stamps = registry.flatten(registry.get('app', 'ts'));
    const { files, hints } = await applyPatches(await renderStamps(stamps, answers), stamps, await tempDir());

    const output = Object.fromEntries(files.map((file) => [file.path, file.content.toString()]));
    const manifest = JSON.parse(output['package.json']);
    const versions = await declaredVersions(stamps);

    expect(hints).toEqual([]);
    for (const section of DEPENDENCY_SECTIONS) {
      for (const [name, version] of Object.entries(manifest[section] ?? {})) {
        expect(version, name).toBe(versions[name]);
      }
    }
    expect({ ...output, 'package.json': maskVersions(output['package.json']) }).toMatchSnapshot();
  });

  it('uses tabs for go files and spaces for typescript projects', async () => {
    const [go] = await renderStamps([registry.get('editorconfig', 'go')], {});
    const [ts] = await renderStamps([registry.get('editorconfig', 'ts')], {});

    expect(go.content.toString()).toMatch(/\[\{\*\.go,go\.mod\}\]\nindent_style = tab/);
    expect(ts.content.toString()).toContain('indent_style = space');
  });
});
