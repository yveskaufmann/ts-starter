import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { prepareRun } from './generate.js';
import { loadRegistry } from './registry.js';
import { makeStamps, tempDir, writeTree } from './test-helpers.js';
import { resolveConflicts, writePlan } from './write.js';

const name = { name: 'name', message: 'Name?' };

async function registry() {
  return loadRegistry(
    await makeStamps({
      'app:ts': {
        manifest: {
          description: 'App',
          mode: 'project',
          prompts: [name, { name: 'author', message: 'Author?', default: 'me' }],
          includes: ['editorconfig:ts'],
        },
        files: { 'README.md.hbs': '# {{name}} by {{author}}\n' },
      },
      'editorconfig:ts': {
        manifest: { description: 'Editor config', mode: 'inject' },
        files: { '.editorconfig': 'root = true\n' },
      },
    }),
  );
}

const run = async (options) => {
  const reg = await registry();
  const [stampName, variant] = options.id.split(':');
  return prepareRun({ registry: reg, stamp: reg.get(stampName, variant), yes: true, ...options });
};

describe('prepareRun', () => {
  it('creates a project in a new directory named after the dash cased name', async () => {
    const cwd = await tempDir();

    const result = await run({ id: 'app:ts', cwd, target: 'My Test' });

    expect(result.targetDir).toBe(path.join(cwd, 'my-test'));
    expect(result.answers).toEqual({ name: 'My Test', author: 'me' });
    expect(result.plan.map((entry) => [entry.path, entry.status])).toEqual([
      ['.editorconfig', 'new'],
      ['README.md', 'new'],
    ]);
    expect(result.plan[1].content.toString()).toBe('# My Test by me\n');
  });

  it('writes nothing while preparing', async () => {
    const cwd = await tempDir();
    await run({ id: 'app:ts', cwd, target: 'demo' });

    await expect(readFile(path.join(cwd, 'demo', 'README.md'))).rejects.toThrow();
  });

  it('uses the current directory and its folder name for "."', async () => {
    const cwd = path.join(await tempDir(), 'Some Folder');
    await writeTree(cwd, {});

    const result = await run({ id: 'app:ts', cwd, target: '.' });

    expect(result.targetDir).toBe(cwd);
    expect(result.answers.name).toBe('Some Folder');
  });

  it('asks for the name of a project without target', async () => {
    const cwd = await tempDir();
    const ask = vi.fn(async () => 'Asked');

    const result = await run({ id: 'app:ts', cwd, ask });

    expect(ask).toHaveBeenCalledTimes(1);
    expect(result.targetDir).toBe(path.join(cwd, 'asked'));
  });

  it('rejects targets that are paths and conflicting names', async () => {
    const cwd = await tempDir();

    await expect(run({ id: 'app:ts', cwd, target: '../x' })).rejects.toThrow('not a project name');
    await expect(run({ id: 'app:ts', cwd, target: 'a', set: { name: 'b' } })).rejects.toThrow('do not match');
  });

  it('injects into the current directory by default and into an existing directory', async () => {
    const cwd = await tempDir();
    await writeTree(cwd, { sub: {} });

    expect((await run({ id: 'editorconfig:ts', cwd })).targetDir).toBe(cwd);
    expect((await run({ id: 'editorconfig:ts', cwd, target: 'sub' })).targetDir).toBe(path.join(cwd, 'sub'));
    await expect(run({ id: 'editorconfig:ts', cwd, target: 'missing' })).rejects.toThrow('does not exist');
  });

  it('reports conflicts and writes the rest after they are resolved', async () => {
    const cwd = await tempDir();
    await writeTree(cwd, { '.editorconfig': 'custom\n' });
    const { plan, targetDir } = await run({ id: 'editorconfig:ts', cwd });

    expect(plan.map((entry) => entry.status)).toEqual(['conflict']);
    await expect(resolveConflicts(plan, {})).rejects.toThrow('already exist');

    await writePlan(await resolveConflicts(plan, { strategy: 'force' }), targetDir);
    expect(await readFile(path.join(cwd, '.editorconfig'), 'utf8')).toBe('root = true\n');
  });

  it('does not report the second run of a stamp as conflict when nothing changed', async () => {
    const cwd = await tempDir();
    const first = await run({ id: 'editorconfig:ts', cwd });
    await writePlan(first.plan, first.targetDir);

    expect((await run({ id: 'editorconfig:ts', cwd })).plan.map((entry) => entry.status)).toEqual(['identical']);
  });
});
