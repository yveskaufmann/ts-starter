import { describe, expect, it } from 'vitest';

import { StampError } from './errors.js';
import { loadRegistry, parseStampId, validateManifest } from './registry.js';
import { makeStamps } from './test-helpers.js';

const inject = { description: 'An inject stamp', mode: 'inject' };

describe('parseStampId', () => {
  it('splits name and variant', () => {
    expect(parseStampId('editorconfig:go')).toEqual({ name: 'editorconfig', variant: 'go' });
    expect(parseStampId('app')).toEqual({ name: 'app' });
  });

  it.each(['', ':ts', 'app:', 'a:b:c'])('rejects "%s"', (value) => {
    expect(() => parseStampId(value)).toThrow(StampError);
  });
});

describe('validateManifest', () => {
  it('applies defaults', () => {
    expect(validateManifest(inject, 'a:b')).toEqual({
      description: 'An inject stamp',
      mode: 'inject',
      prompts: [],
      includes: [],
      files: undefined,
    });
  });

  it('defaults the prompt type to input', () => {
    const manifest = { ...inject, prompts: [{ name: 'author', message: 'Author?', default: 'me' }] };
    expect(validateManifest(manifest, 'a:b').prompts).toEqual([
      { name: 'author', message: 'Author?', type: 'input', default: 'me' },
    ]);
  });

  it.each([
    ['a non object', [], /must contain an object/],
    ['a missing description', { mode: 'inject' }, /"description"/],
    ['an unknown mode', { ...inject, mode: 'both' }, /"mode" must be project or inject/],
    ['prompts that are not an array', { ...inject, prompts: {} }, /"prompts" must be an array/],
    ['a prompt without a message', { ...inject, prompts: [{ name: 'x' }] }, /prompts\[0\]\.message/],
    [
      'an unknown prompt type',
      { ...inject, prompts: [{ name: 'x', message: 'x', type: 'list' }] },
      /unknown type "list"/,
    ],
    [
      'a default of the wrong type',
      { ...inject, prompts: [{ name: 'x', message: 'x', type: 'confirm', default: 'yes' }] },
      /must be a boolean/,
    ],
    [
      'a duplicated prompt',
      {
        ...inject,
        prompts: [
          { name: 'x', message: 'x' },
          { name: 'x', message: 'y' },
        ],
      },
      /declared twice/,
    ],
    ['a project without name prompt', { ...inject, mode: 'project' }, /prompt called "name"/],
    ['includes with a non string', { ...inject, includes: [1] }, /"includes"/],
    ['an absolute files directory', { ...inject, files: '/etc' }, /inside the stamp/],
    ['a files directory leaving the stamp', { ...inject, files: '../other' }, /inside the stamp/],
  ])('rejects %s', (_, manifest, message) => {
    expect(() => validateManifest(manifest, 'a:b')).toThrow(message);
  });
});

describe('loadRegistry', () => {
  it('loads stamps and lists names and variants sorted', async () => {
    const registry = await loadRegistry(
      await makeStamps({
        'editorconfig:ts': { manifest: inject },
        'editorconfig:go': { manifest: inject },
        'prettier:ts': { manifest: inject },
      }),
    );

    expect(registry.names()).toEqual(['editorconfig', 'prettier']);
    expect(registry.variants('editorconfig')).toEqual(['go', 'ts']);
    expect(registry.variants('unknown')).toEqual([]);
    expect(registry.get('prettier', 'ts')).toMatchObject({ id: 'prettier:ts', mode: 'inject' });
  });

  it('explains unknown stamps and variants', async () => {
    const registry = await loadRegistry(await makeStamps({ 'editorconfig:ts': { manifest: inject } }));

    expect(() => registry.get('nope', 'ts')).toThrow('Unknown stamp "nope". Available stamps: editorconfig');
    expect(() => registry.get('editorconfig', 'go')).toThrow('Available variants: ts');
  });

  it('fails with the file name for a stamp without or with a broken stamp.json', async () => {
    await expect(loadRegistry(await makeStamps({ 'a:b': { manifest: '{ nope' } }))).rejects.toThrow(
      /a:b: cannot read .*stamp\.json/,
    );
  });

  it('rejects invalid names', async () => {
    await expect(loadRegistry(await makeStamps({ 'Bad:ts': { manifest: inject } }))).rejects.toThrow(/lower case/);
  });

  it('rejects includes of unknown stamps, of stamps without variant and of project stamps', async () => {
    const project = { ...inject, mode: 'project', prompts: [{ name: 'name', message: 'Name?' }] };

    await expect(
      loadRegistry(await makeStamps({ 'a:b': { manifest: { ...inject, includes: ['x:y'] } } })),
    ).rejects.toThrow('includes "x:y", which does not exist');
    await expect(
      loadRegistry(await makeStamps({ 'a:b': { manifest: { ...inject, includes: ['x'] } } })),
    ).rejects.toThrow('needs a variant');
    await expect(
      loadRegistry(
        await makeStamps({ 'a:b': { manifest: { ...inject, includes: ['app:ts'] } }, 'app:ts': { manifest: project } }),
      ),
    ).rejects.toThrow('only inject stamps can be included');
  });

  it('rejects include cycles and names the chain', async () => {
    const stamps = await makeStamps({
      'a:x': { manifest: { ...inject, includes: ['b:x'] } },
      'b:x': { manifest: { ...inject, includes: ['a:x'] } },
    });
    await expect(loadRegistry(stamps)).rejects.toThrow('a:x -> b:x -> a:x');
  });
});

describe('Registry.flatten', () => {
  it('puts included stamps first, depth first, without duplicates', async () => {
    const registry = await loadRegistry(
      await makeStamps({
        'app:ts': {
          manifest: {
            ...inject,
            mode: 'project',
            prompts: [{ name: 'name', message: 'Name?' }],
            includes: ['one:x', 'two:x'],
          },
        },
        'one:x': { manifest: { ...inject, includes: ['base:x'] } },
        'two:x': { manifest: { ...inject, includes: ['base:x'] } },
        'base:x': { manifest: inject },
      }),
    );

    expect(registry.flatten(registry.get('app', 'ts')).map((stamp) => stamp.id)).toEqual([
      'base:x',
      'one:x',
      'two:x',
      'app:ts',
    ]);
  });
});
