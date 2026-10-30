import { chmod } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadRegistry } from './registry.js';
import { renderStamp, renderStamps } from './render.js';
import { makeStamps } from './test-helpers.js';

const inject = { description: 'A stamp', mode: 'inject' };

async function load(definitions) {
  return loadRegistry(await makeStamps(definitions));
}

describe('renderStamp', () => {
  it('renders .hbs files without extension and copies other files unchanged', async () => {
    const registry = await load({
      'a:x': {
        manifest: inject,
        files: {
          'README.md.hbs': '# {{name}}\n',
          '.editorconfig': 'root = true\n',
          src: { 'a.txt': '{{not rendered}}' },
        },
      },
    });

    const files = await renderStamp(registry.get('a', 'x'), { name: 'demo' });

    expect(files.map((file) => [file.path, file.content.toString()])).toEqual([
      ['.editorconfig', 'root = true\n'],
      ['README.md', '# demo\n'],
      ['src/a.txt', '{{not rendered}}'],
    ]);
    expect(files.every((file) => file.stamp === 'a:x')).toBe(true);
  });

  it('does not escape values and provides the case helpers', async () => {
    const registry = await load({
      'a:x': {
        manifest: inject,
        files: {
          'out.txt.hbs':
            '{{name}}|{{dashCase name}}|{{camelCase name}}|{{pascalCase name}}|{{snakeCase name}}|{{upperCase name}}',
        },
      },
    });

    const [file] = await renderStamp(registry.get('a', 'x'), { name: 'My App & Co' });

    expect(file.content.toString()).toBe('My App & Co|my-app-co|myAppCo|MyAppCo|my_app_co|MY APP & CO');
  });

  it('fails for unknown variables and names the stamp and file', async () => {
    const registry = await load({ 'a:x': { manifest: inject, files: { 'out.txt.hbs': '{{missing}}' } } });

    await expect(renderStamp(registry.get('a', 'x'), {})).rejects.toThrow(
      /Stamp a:x: cannot render out\.txt\.hbs: .*missing/,
    );
  });

  it('keeps binary content byte for byte and the file mode', async () => {
    const root = await makeStamps({ 'a:x': { manifest: inject } });
    const { writeFile, mkdir } = await import('node:fs/promises');
    const filesDir = path.join(root, 'a', 'x', 'files');
    const bytes = Buffer.from([0, 255, 10, 13, 128]);
    await mkdir(filesDir, { recursive: true });
    await writeFile(path.join(filesDir, 'blob.bin'), bytes);
    await writeFile(path.join(filesDir, 'run.sh'), '#!/bin/sh\n');
    await chmod(path.join(filesDir, 'run.sh'), 0o755);

    const files = await renderStamp((await loadRegistry(root)).get('a', 'x'), {});

    expect(files.find((file) => file.path === 'blob.bin').content.equals(bytes)).toBe(true);
    expect(files.find((file) => file.path === 'run.sh').mode & 0o777).toBe(0o755);
  });

  it('allows a missing default files directory but not a declared one', async () => {
    const registry = await load({
      'a:x': { manifest: inject },
      'b:x': { manifest: { ...inject, files: 'content' } },
    });

    expect(await renderStamp(registry.get('a', 'x'), {})).toEqual([]);
    await expect(renderStamp(registry.get('b', 'x'), {})).rejects.toThrow('files directory');
  });
});

describe('renderStamps', () => {
  it('lets later stamps win and orders the result by path', async () => {
    const registry = await load({
      'base:x': { manifest: inject, files: { b: 'base b', a: 'base a' } },
      'app:x': {
        manifest: { ...inject, includes: ['base:x'] },
        files: { b: 'app b', c: 'app c' },
      },
    });

    const files = await renderStamps(registry.flatten(registry.get('app', 'x')), {});

    expect(files.map((file) => [file.path, file.content.toString(), file.stamp])).toEqual([
      ['a', 'base a', 'base:x'],
      ['b', 'app b', 'app:x'],
      ['c', 'app c', 'app:x'],
    ]);
  });
});
