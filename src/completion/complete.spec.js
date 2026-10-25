import { describe, expect, it } from 'vitest';

import { loadRegistry } from '../stamps/index.js';
import { makeStamps } from '../stamps/test-helpers.js';

import { complete } from './complete.js';

const registry = await loadRegistry(
  await makeStamps({
    'app:ts': {
      manifest: {
        description: 'App',
        mode: 'project',
        prompts: [
          { name: 'name', message: 'Name?' },
          { name: 'author', message: 'Author?' },
        ],
        includes: ['editorconfig:ts'],
      },
    },
    'editorconfig:ts': {
      manifest: { description: 'Editor config', mode: 'inject', prompts: [{ name: 'indent', message: 'Indent?' }] },
    },
    'editorconfig:go': { manifest: { description: 'Editor config', mode: 'inject' } },
  }),
);

const words = (line) => (line.endsWith(' ') ? [...line.trim().split(/\s+/), ''] : line.split(/\s+/));
const suggest = (line) => complete(words(line), registry);

describe('complete', () => {
  it.each([
    ['', ['create', 'list', 'info', 'completion']],
    ['c', ['create', 'completion']],
    ['l', ['list']],
    ['x', []],
    ['--', ['--help', '--version']],
  ])('suggests commands for "%s"', (line, expected) => {
    expect(complete([line], registry)).toEqual(expected);
  });

  it('suggests stamps with their variants after create and info', () => {
    expect(suggest('create ')).toEqual(['app:ts', 'editorconfig:go', 'editorconfig:ts']);
    expect(suggest('create ed')).toEqual(['editorconfig:go', 'editorconfig:ts']);
    expect(suggest('create editorconfig:')).toEqual(['editorconfig:go', 'editorconfig:ts']);
    expect(suggest('create editorconfig:g')).toEqual(['editorconfig:go']);
    expect(suggest('create nope')).toEqual([]);
    expect(suggest('info e')).toEqual(['editorconfig:go', 'editorconfig:ts']);
  });

  it('asks for file completion for the target of create and nothing after it', () => {
    expect(suggest('create app:ts ')).toEqual([':files']);
    expect(suggest('create app:ts dem')).toEqual([':files']);
    expect(suggest('create app:ts demo ')).toEqual([]);
    expect(suggest('info app:ts ')).toEqual([]);
  });

  it('suggests stamp names after list and shells after completion', () => {
    expect(suggest('list ')).toEqual(['app', 'editorconfig']);
    expect(suggest('list e')).toEqual(['editorconfig']);
    expect(suggest('list app ')).toEqual([]);
    expect(suggest('completion ')).toEqual(['bash', 'zsh']);
    expect(suggest('completion z')).toEqual(['zsh']);
    expect(suggest('completion bash ')).toEqual([]);
  });

  it('suggests the options of a command and leaves out used flags', () => {
    expect(suggest('create app:ts --')).toEqual([
      '--set',
      '--yes',
      '--dry-run',
      '--force',
      '--skip-existing',
      '--help',
    ]);
    expect(suggest('create --yes app:ts --y')).toEqual([]);
    expect(suggest('create --force --s')).toEqual(['--set', '--skip-existing']);
    expect(suggest('create --set a=1 --s')).toEqual(['--set', '--skip-existing']);
    expect(suggest('list --')).toEqual(['--json', '--help']);
  });

  it('suggests the prompts of the stamp, including the included ones, after --set', () => {
    expect(suggest('create app:ts --set ')).toEqual(['author=', 'indent=', 'name=']);
    expect(suggest('create app:ts --set a')).toEqual(['author=']);
    expect(suggest('create --set ')).toEqual([]);
    expect(suggest('create app:ts --set name=x ')).toEqual([':files']);
  });

  it('counts the value of --set when looking for the position', () => {
    expect(suggest('create --set name=x app:ts ')).toEqual([':files']);
  });

  it('returns nothing for unknown commands and no words', () => {
    expect(suggest('nope ')).toEqual([]);
    expect(complete([], registry)).toEqual([]);
  });
});
