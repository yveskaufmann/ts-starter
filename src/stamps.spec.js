import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, it } from 'vitest';

import { loadRegistry, renderStamps } from './stamps/index.js';

const stampsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'stamps');
const answers = { name: 'Demo App', description: 'A demo & more', author: 'Me <me@example.org>' };

/** @type {import('./stamps/registry.js').Registry} */
let registry;

beforeAll(async () => {
  registry = await loadRegistry(stampsDir);
});

describe('shipped stamps', () => {
  it('provides the expected stamps and variants', () => {
    expect(registry.all().map((stamp) => stamp.id)).toEqual([
      'app:ts',
      'editorconfig:go',
      'editorconfig:ts',
      'gitignore:node',
      'prettier:ts',
      'tsconfig:ts',
      'vitest:ts',
      'vscode:ts',
    ]);
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

    expect(order).toEqual([
      'editorconfig:ts',
      'prettier:ts',
      'tsconfig:ts',
      'vitest:ts',
      'vscode:ts',
      'gitignore:node',
      'app:ts',
    ]);
  });

  it('renders the app:ts project', async () => {
    const files = await renderStamps(registry.flatten(registry.get('app', 'ts')), answers);

    expect(Object.fromEntries(files.map((file) => [file.path, file.content.toString()]))).toMatchSnapshot();
  });

  it('uses tabs for go files and spaces for typescript projects', async () => {
    const [go] = await renderStamps([registry.get('editorconfig', 'go')], {});
    const [ts] = await renderStamps([registry.get('editorconfig', 'ts')], {});

    expect(go.content.toString()).toMatch(/\[\{\*\.go,go\.mod\}\]\nindent_style = tab/);
    expect(ts.content.toString()).toContain('indent_style = space');
  });
});
