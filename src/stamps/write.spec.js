import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';
import { tempDir, writeTree } from './test-helpers.js';
import { planWrites, resolveConflicts, writePlan } from './write.js';

const file = (filePath, content, mode = 0o644) => ({
  path: filePath,
  content: Buffer.from(content),
  mode,
  stamp: 'a:x',
});
const statuses = (plan) => plan.map((entry) => [entry.path, entry.status, entry.action]);

describe('planWrites', () => {
  it('detects new, identical and conflicting files', async () => {
    const dir = await tempDir();
    await writeTree(dir, { same: 'same', changed: 'old' });

    const plan = await planWrites([file('new', 'n'), file('same', 'same'), file('changed', 'new')], dir);

    expect(statuses(plan)).toEqual([
      ['new', 'new', 'write'],
      ['same', 'identical', 'skip'],
      ['changed', 'conflict', 'write'],
    ]);
    expect(plan[2].existing.toString()).toBe('old');
  });

  it('works for a target directory that does not exist', async () => {
    const dir = path.join(await tempDir(), 'missing');

    expect(statuses(await planWrites([file('a/b.txt', 'x')], dir))).toEqual([['a/b.txt', 'new', 'write']]);
  });

  it('fails when a directory is in the way', async () => {
    const dir = await tempDir();
    await mkdir(path.join(dir, 'a'));

    await expect(planWrites([file('a', 'x')], dir)).rejects.toThrow('not a regular file');
  });

  it('refuses paths outside of the target', async () => {
    await expect(planWrites([file('../evil', 'x')], await tempDir())).rejects.toThrow('outside of');
  });
});

describe('resolveConflicts', () => {
  const conflicts = async () => {
    const dir = await tempDir();
    await writeTree(dir, { a: 'old', b: 'old' });
    return planWrites([file('a', 'new'), file('b', 'new'), file('c', 'new')], dir);
  };

  it('overwrites everything with force and skips everything with skip', async () => {
    expect(statuses(await resolveConflicts(await conflicts(), { strategy: 'force' }))).toEqual([
      ['a', 'conflict', 'write'],
      ['b', 'conflict', 'write'],
      ['c', 'new', 'write'],
    ]);
    expect(statuses(await resolveConflicts(await conflicts(), { strategy: 'skip' }))).toEqual([
      ['a', 'conflict', 'skip'],
      ['b', 'conflict', 'skip'],
      ['c', 'new', 'write'],
    ]);
  });

  it('asks per conflict', async () => {
    const ask = vi.fn().mockResolvedValueOnce('skip').mockResolvedValueOnce('overwrite');

    const resolved = await resolveConflicts(await conflicts(), { ask });

    expect(statuses(resolved).map(([, , action]) => action)).toEqual(['skip', 'write', 'write']);
    expect(ask).toHaveBeenCalledTimes(2);
    expect(ask.mock.calls[0][0]).toMatchObject({ path: 'a', existing: Buffer.from('old') });
  });

  it('remembers overwrite-all and skip-all', async () => {
    const overwriteAll = vi.fn().mockResolvedValue('overwrite-all');
    const skipAll = vi.fn().mockResolvedValue('skip-all');

    expect((await resolveConflicts(await conflicts(), { ask: overwriteAll })).map((e) => e.action)).toEqual([
      'write',
      'write',
      'write',
    ]);
    expect((await resolveConflicts(await conflicts(), { ask: skipAll })).map((e) => e.action)).toEqual([
      'skip',
      'skip',
      'write',
    ]);
    expect(overwriteAll).toHaveBeenCalledTimes(1);
    expect(skipAll).toHaveBeenCalledTimes(1);
  });

  it('fails without strategy and terminal, but only when there is a conflict', async () => {
    await expect(resolveConflicts(await conflicts(), {})).rejects.toThrow(/already exist: a, b\. Nothing was written/);
    expect(await resolveConflicts([{ ...file('n', 'x'), status: 'new', action: 'write' }], {})).toHaveLength(1);
  });
});

describe('writePlan', () => {
  it('writes entries to write, creates directories, keeps the mode and reports skipped files', async () => {
    const dir = await tempDir();
    await writeTree(dir, { keep: 'old' });
    const plan = await resolveConflicts(
      await planWrites([file('a/b/c.txt', 'c'), file('run.sh', '#!/bin/sh', 0o755), file('keep', 'new')], dir),
      { strategy: 'skip' },
    );

    const result = await writePlan(plan, dir);

    expect(result).toEqual({ written: ['a/b/c.txt', 'run.sh'], skipped: ['keep'] });
    expect(await readFile(path.join(dir, 'a/b/c.txt'), 'utf8')).toBe('c');
    expect(await readFile(path.join(dir, 'keep'), 'utf8')).toBe('old');
    expect((await stat(path.join(dir, 'run.sh'))).mode & 0o777).toBe(0o755);
  });

  it('removes a target directory it created when writing fails', async () => {
    const dir = path.join(await tempDir(), 'project');
    const plan = await planWrites([file('a', 'x'), file('a/b', 'y')], dir);

    await expect(writePlan(plan, dir)).rejects.toThrow();

    await expect(readFile(path.join(dir, 'a'))).rejects.toThrow();
    await expect(access(dir)).rejects.toThrow();
  });

  it('keeps an existing target directory when writing fails', async () => {
    const dir = await tempDir();
    await writeFile(path.join(dir, 'blocker'), 'x');
    const plan = [
      { ...file('ok', 'x'), status: 'new', action: 'write' },
      { ...file('blocker/inner', 'y'), status: 'new', action: 'write' },
    ];

    await expect(writePlan(plan, dir)).rejects.toThrow();

    expect(await readFile(path.join(dir, 'blocker'), 'utf8')).toBe('x');
  });
});
