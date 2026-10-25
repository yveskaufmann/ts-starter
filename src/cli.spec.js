import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { EXIT, main } from './cli.js';
import { makeStamps, tempDir, writeTree } from './stamps/test-helpers.js';

const author = { name: 'author', message: 'Author?', default: 'me' };

async function setup() {
  const stampsDir = await makeStamps({
    'app:ts': {
      manifest: {
        description: 'TypeScript app',
        mode: 'project',
        prompts: [{ name: 'name', message: 'Name?' }, author],
        includes: ['editorconfig:ts'],
      },
      files: { 'README.md.hbs': '# {{name}} by {{author}}\n' },
    },
    'editorconfig:ts': {
      manifest: { description: 'Editor config for ts', mode: 'inject' },
      files: { '.editorconfig': 'indent = 2\n' },
    },
    'editorconfig:go': {
      manifest: { description: 'Editor config for go', mode: 'inject' },
      files: { '.editorconfig': 'indent = tab\n' },
    },
  });
  return { stampsDir, cwd: await tempDir() };
}

async function run(argv, { ui = {}, interactive = false, ...rest } = {}) {
  const base = await setup();
  const out = { stdout: '', stderr: '' };
  const code = await main(argv, {
    ...base,
    ...rest,
    interactive,
    ui,
    stdout: { write: (text) => (out.stdout += text) },
    stderr: { write: (text) => (out.stderr += text) },
  });
  return { code, ...out, cwd: rest.cwd ?? base.cwd };
}

const exists = (file) =>
  access(file).then(
    () => true,
    () => false,
  );

describe('help and errors', () => {
  it('prints the usage with --help to stdout', async () => {
    const result = await run(['--help']);

    expect(result.code).toBe(EXIT.ok);
    expect(result.stdout).toContain('Usage: ts-starter <command>');
  });

  it('prints the usage to stderr and fails without a command', async () => {
    const result = await run([]);

    expect(result).toMatchObject({ code: EXIT.usage, stdout: '' });
    expect(result.stderr).toContain('Commands:');
  });

  it('prints the version', async () => {
    const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
    expect((await run(['--version'])).stdout).toBe(`${version}\n`);
  });

  it('reports usage errors with exit code 2', async () => {
    const result = await run(['create']);

    expect(result.code).toBe(EXIT.usage);
    expect(result.stderr).toContain('Error: Missing stamp');
    expect(result.stderr).toContain('ts-starter --help');
  });

  it('reports unknown stamps and variants with exit code 1', async () => {
    expect((await run(['create', 'nope'])).stderr).toContain(
      'Unknown stamp "nope". Available stamps: app, editorconfig',
    );
    expect((await run(['create', 'editorconfig:rust'])).stderr).toContain('Available variants: go, ts');
    expect((await run(['create', 'editorconfig:rust'])).code).toBe(EXIT.failure);
  });

  it('maps an interrupted prompt to 130 and a bug to 1', async () => {
    const interrupted = Object.assign(new Error('x'), { name: 'ExitPromptError' });
    const ui = { ask: vi.fn().mockRejectedValue(interrupted) };

    const result = await run(['create', 'app:ts'], { ui, interactive: true });

    expect(result).toMatchObject({ code: EXIT.interrupted });
    expect(result.stderr).toContain('nothing was written');
    expect((await run(['list'], { stampsDir: '/does/not/exist' })).code).toBe(EXIT.failure);
  });
});

describe('create', () => {
  it('creates a project from a name and includes the other stamps', async () => {
    const result = await run(['create', 'app:ts', 'My App', '--yes']);

    expect(result.code).toBe(EXIT.ok);
    const dir = path.join(result.cwd, 'my-app');
    expect(await readFile(path.join(dir, 'README.md'), 'utf8')).toBe('# My App by me\n');
    expect(await readFile(path.join(dir, '.editorconfig'), 'utf8')).toBe('indent = 2\n');
    expect(result.stdout).toContain('app:ts: wrote 2 files to my-app');
    expect(result.stdout).toContain('Next: cd my-app');
  });

  it('uses the current directory and its name for "."', async () => {
    const base = await setup();
    const cwd = path.join(await tempDir(), 'Folder Name');
    await writeTree(cwd, {});

    const result = await run(['create', 'app:ts', '.', '--yes'], { cwd, stampsDir: base.stampsDir });

    expect(await readFile(path.join(cwd, 'README.md'), 'utf8')).toBe('# Folder Name by me\n');
    expect(result.stdout).not.toContain('Next:');
  });

  it('asks for missing values when interactive', async () => {
    const ui = { ask: vi.fn(async (prompt) => (prompt.name === 'name' ? 'Asked' : 'someone')) };

    const result = await run(['create', 'app:ts'], { ui, interactive: true });

    expect(ui.ask).toHaveBeenCalledTimes(2);
    expect(await readFile(path.join(result.cwd, 'asked', 'README.md'), 'utf8')).toBe('# Asked by someone\n');
  });

  it('fails with a hint instead of asking without a terminal', async () => {
    const result = await run(['create', 'app:ts']);

    expect(result.code).toBe(EXIT.failure);
    expect(result.stderr).toContain('Pass --set name=<value>');
  });

  it('answers values with --set', async () => {
    const result = await run(['create', 'app:ts', 'demo', '--set', 'author=Yves', '--yes']);

    expect(await readFile(path.join(result.cwd, 'demo', 'README.md'), 'utf8')).toBe('# demo by Yves\n');
    expect((await run(['create', 'app:ts', 'demo', '--set', 'typo=1', '--yes'])).stderr).toContain(
      'Unknown value "typo"',
    );
  });

  it('asks for the variant when it is missing and fails without a terminal', async () => {
    const ui = { askVariant: vi.fn(async () => 'go') };

    const asked = await run(['create', 'editorconfig'], { ui, interactive: true });
    expect(ui.askVariant).toHaveBeenCalledWith('editorconfig', ['go', 'ts']);
    expect(await readFile(path.join(asked.cwd, '.editorconfig'), 'utf8')).toBe('indent = tab\n');

    const failed = await run(['create', 'editorconfig']);
    expect(failed.code).toBe(EXIT.failure);
    expect(failed.stderr).toContain('Missing variant for "editorconfig", use editorconfig:go or editorconfig:ts');
  });

  it('injects a stamp into the current directory', async () => {
    const result = await run(['create', 'editorconfig:go']);

    expect(result.code).toBe(EXIT.ok);
    expect(await readFile(path.join(result.cwd, '.editorconfig'), 'utf8')).toBe('indent = tab\n');
    expect(result.stdout).toContain('create    .editorconfig');
  });

  it('does not write anything with --dry-run and shows conflicts', async () => {
    const base = await setup();
    await writeTree(base.cwd, { '.editorconfig': 'custom\n' });

    const result = await run(['create', 'editorconfig:ts', '--dry-run'], base);

    expect(result.code).toBe(EXIT.ok);
    expect(result.stdout).toContain('Dry run');
    expect(result.stdout).toContain('overwrite .editorconfig');
    expect(await readFile(path.join(base.cwd, '.editorconfig'), 'utf8')).toBe('custom\n');
  });

  it('fails on conflicts without terminal, then honors --force and --skip-existing', async () => {
    const base = await setup();
    const file = path.join(base.cwd, '.editorconfig');
    await writeTree(base.cwd, { '.editorconfig': 'custom\n' });

    const failed = await run(['create', 'editorconfig:ts'], base);
    expect(failed.code).toBe(EXIT.failure);
    expect(failed.stderr).toContain('already exist: .editorconfig. Nothing was written');
    expect(await readFile(file, 'utf8')).toBe('custom\n');

    const skipped = await run(['create', 'editorconfig:ts', '--skip-existing'], base);
    expect(skipped.stdout).toContain('keep      .editorconfig');
    expect(await readFile(file, 'utf8')).toBe('custom\n');

    await run(['create', 'editorconfig:ts', '--force'], base);
    expect(await readFile(file, 'utf8')).toBe('indent = 2\n');
  });

  it('asks per conflicting file when interactive', async () => {
    const base = await setup();
    await writeTree(base.cwd, { '.editorconfig': 'custom\n' });
    const ui = { askConflict: vi.fn(async () => 'overwrite') };

    await run(['create', 'editorconfig:ts'], { ...base, ui, interactive: true });

    expect(ui.askConflict).toHaveBeenCalledTimes(1);
    expect(await readFile(path.join(base.cwd, '.editorconfig'), 'utf8')).toBe('indent = 2\n');
  });

  it('leaves no project directory behind when the run fails', async () => {
    const result = await run(['create', 'app:ts', 'demo']);

    expect(result.code).toBe(EXIT.failure);
    expect(await exists(path.join(result.cwd, 'demo'))).toBe(false);
  });
});

describe('list', () => {
  it('lists all stamps', async () => {
    const { stdout } = await run(['list']);

    expect(stdout.split('\n').filter(Boolean)).toEqual([
      'app:ts           project  TypeScript app',
      'editorconfig:go  inject   Editor config for go',
      'editorconfig:ts  inject   Editor config for ts',
    ]);
  });

  it('filters by stamp and prints json', async () => {
    const result = await run(['list', 'editorconfig', '--json']);

    expect(JSON.parse(result.stdout).map((stamp) => stamp.id)).toEqual(['editorconfig:go', 'editorconfig:ts']);
    expect(JSON.parse(result.stdout)[0]).toEqual({
      id: 'editorconfig:go',
      name: 'editorconfig',
      variant: 'go',
      description: 'Editor config for go',
      mode: 'inject',
    });
    expect((await run(['list', 'nope'])).code).toBe(EXIT.failure);
  });
});

describe('completion', () => {
  it('prints the script of a supported shell', async () => {
    for (const shell of ['bash', 'zsh']) {
      const expected = await readFile(new URL(`./completion/${shell}.sh`, import.meta.url), 'utf8');
      expect(await run(['completion', shell])).toMatchObject({ code: EXIT.ok, stdout: expected });
    }
  });

  it('does not need the stamps', async () => {
    expect((await run(['completion', 'bash'], { stampsDir: '/does/not/exist' })).code).toBe(EXIT.ok);
  });

  it('rejects a missing or unsupported shell', async () => {
    expect(await run(['completion'])).toMatchObject({ code: EXIT.usage });
    const fish = await run(['completion', 'fish']);
    expect(fish.code).toBe(EXIT.usage);
    expect(fish.stderr).toContain('Unsupported shell "fish", use one of: bash, zsh');
  });
});

describe('__complete', () => {
  it('prints suggestions even for words that look like options', async () => {
    expect((await run(['__complete', 'create', 'editorconfig:'])).stdout).toBe('editorconfig:go\neditorconfig:ts\n');
    expect((await run(['__complete', 'create', 'app:ts', '--'])).stdout).toContain('--dry-run\n');
  });

  it('never fails and prints nothing when the stamps cannot be loaded', async () => {
    expect(await run(['__complete', 'create', ''], { stampsDir: '/does/not/exist' })).toMatchObject({
      code: EXIT.ok,
      stdout: '',
      stderr: '',
    });
  });
});

describe('info', () => {
  it('shows values, includes and files', async () => {
    const { code, stdout } = await run(['info', 'app:ts']);

    expect(code).toBe(EXIT.ok);
    expect(stdout).toContain('app:ts (project)\nTypeScript app');
    expect(stdout).toContain('name           Name?');
    expect(stdout).toContain('author         Author? [default: me]');
    expect(stdout).toContain('Includes: editorconfig:ts');
    expect(stdout).toContain('  .editorconfig  (editorconfig:ts)\n  README.md\n');
  });

  it('needs a variant', async () => {
    const result = await run(['info', 'editorconfig']);

    expect(result.code).toBe(EXIT.usage);
    expect(result.stderr).toContain('use editorconfig:go or editorconfig:ts');
  });
});
