import { describe, expect, it } from 'vitest';

import { StampError } from './errors.js';
import { applyPatches, stringify } from './patch.js';
import { tempDir, writeTree } from './test-helpers.js';

const stamp = (id, { npm = {}, patches = [] }) => ({ id, npm, patches });
const file = (path, content, extra = {}) => ({
  path,
  content: Buffer.from(content),
  mode: 0o644,
  stamp: 'base:ts',
  ...extra,
});
const patch = (path, merge) => ({ file: path, merge });
const json = (result, path) => JSON.parse(result.files.find((entry) => entry.path === path).content.toString());

describe('applyPatches', () => {
  it('creates a file that does not exist', async () => {
    const result = await applyPatches([], [stamp('a:ts', { patches: [patch('x/y.json', { a: 1 })] })], await tempDir());

    expect(result.files).toMatchObject([{ path: 'x/y.json', stamp: 'a:ts', patched: false }]);
    expect(result.files[0].content.toString()).toBe('{\n  "a": 1\n}\n');
    expect(result.hints).toEqual([]);
  });

  it('adds the values of an array that are missing and keeps the others', async () => {
    const target = await tempDir();
    await writeTree(target, { 'e.json': '{ "recommendations": ["b", "a"] }' });

    const result = await applyPatches(
      [],
      [stamp('a:ts', { patches: [patch('e.json', { recommendations: ['a', 'c'] })] })],
      target,
    );

    expect(json(result, 'e.json')).toEqual({ recommendations: ['b', 'a', 'c'] });
    expect(result.files[0].patched).toBe(true);
    expect(result.hints).toEqual([]);
  });

  it('merges objects, keeps other keys and replaces different values with a hint', async () => {
    const target = await tempDir();
    await writeTree(target, {
      's.json': '{ "editor.defaultFormatter": "prettier", "keep": 1, "[json]": { "x": true, "y": 1 } }',
    });
    const patches = [patch('s.json', { 'editor.defaultFormatter': 'biome', '[json]': { y: 2, z: 3 } })];

    const result = await applyPatches([], [stamp('biome:ts', { patches })], target);

    expect(json(result, 's.json')).toEqual({
      'editor.defaultFormatter': 'biome',
      keep: 1,
      '[json]': { x: true, y: 2, z: 3 },
    });
    expect(result.hints).toEqual([
      's.json: editor.defaultFormatter was "prettier", set to "biome" (biome:ts)',
      's.json: [json].y was 1, set to 2 (biome:ts)',
    ]);
  });

  it('does not report values that are already set', async () => {
    const files = [file('s.json', '{ "a": { "b": 1 } }')];

    const result = await applyPatches(
      files,
      [stamp('a:ts', { patches: [patch('s.json', { a: { b: 1 } })] })],
      await tempDir(),
    );

    expect(result.hints).toEqual([]);
  });

  it('patches a rendered file instead of the one in the target', async () => {
    const target = await tempDir();
    await writeTree(target, { 's.json': '{ "disk": true }' });
    const files = [file('s.json', '{ "rendered": true }')];

    const result = await applyPatches(files, [stamp('a:ts', { patches: [patch('s.json', { a: 1 })] })], target);

    expect(json(result, 's.json')).toEqual({ rendered: true, a: 1 });
    expect(result.files[0]).toMatchObject({ stamp: 'base:ts', patched: false });
  });

  it('applies the patches of all stamps in order', async () => {
    const stamps = [
      stamp('a:ts', { patches: [patch('s.json', { list: ['a'], v: 1 })] }),
      stamp('b:ts', { patches: [patch('s.json', { list: ['b'], v: 2 })] }),
    ];

    const result = await applyPatches([], stamps, await tempDir());

    expect(json(result, 's.json')).toEqual({ list: ['a', 'b'], v: 2 });
    expect(result.hints).toEqual(['s.json: v was 1, set to 2 (b:ts)']);
  });

  describe('npm packages', () => {
    const biome = stamp('biome:ts', { npm: { devDependencies: { '@biomejs/biome': '2.6.4' } } });

    it('adds a missing package to package.json sorted by name', async () => {
      const files = [file('package.json', '{ "name": "x", "devDependencies": { "vitest": "^5" } }')];

      const result = await applyPatches(files, [biome], await tempDir());

      expect(json(result, 'package.json')).toEqual({
        name: 'x',
        devDependencies: { '@biomejs/biome': '2.6.4', vitest: '^5' },
      });
      expect(Object.keys(json(result, 'package.json').devDependencies)).toEqual(['@biomejs/biome', 'vitest']);
      expect(result.hints).toEqual([]);
    });

    it('keeps an existing package and only shows a hint', async () => {
      const target = await tempDir();
      await writeTree(target, { 'package.json': '{ "dependencies": { "@biomejs/biome": "^2.0.0" } }' });

      const result = await applyPatches([], [biome], target);

      expect(json(result, 'package.json')).toEqual({ dependencies: { '@biomejs/biome': '^2.0.0' } });
      expect(result.hints).toEqual([
        'package.json: @biomejs/biome is already a dependency (^2.0.0), not changed (biome:ts)',
      ]);
    });
  });

  it('fails for a file that is not valid JSON', async () => {
    const target = await tempDir();
    await writeTree(target, { 's.json': '{ nope' });

    await expect(applyPatches([], [stamp('a:ts', { patches: [patch('s.json', {})] })], target)).rejects.toThrow(
      StampError,
    );
  });

  it('fails for a file that is not an object', async () => {
    const files = [file('s.json', '[]')];

    await expect(
      applyPatches(files, [stamp('a:ts', { patches: [patch('s.json', {})] })], await tempDir()),
    ).rejects.toThrow(/JSON object/);
  });
});

describe('stringify', () => {
  it('keeps short arrays of simple values on one line and expands objects', () => {
    expect(stringify({ a: ['x', 'y'], b: { c: [] } })).toBe('{\n  "a": ["x", "y"],\n  "b": {\n    "c": []\n  }\n}');
  });

  it('expands arrays that are too long or hold objects', () => {
    expect(stringify([{ a: 1 }])).toBe('[\n  {\n    "a": 1\n  }\n]');
    expect(stringify(['x'.repeat(130)])).toContain('[\n  "x');
  });
});
