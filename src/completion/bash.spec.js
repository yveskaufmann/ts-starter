import { execFile } from 'node:child_process';
import { chmod, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

import { tempDir } from '../stamps/test-helpers.js';

const run = promisify(execFile);
const index = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'index.js');

/** Source the generated script in a real bash and press TAB after `line`. */
async function tab(line, cwd) {
  const bin = await tempDir();
  const wrapper = path.join(bin, 'ts-starter');
  await writeFile(wrapper, `#!/bin/sh\nexec "${process.execPath}" "${index}" "$@"\n`);
  await chmod(wrapper, 0o755);

  const script = `
    source <(ts-starter completion bash)
    COMP_LINE=${JSON.stringify(line)}
    COMP_POINT=\${#COMP_LINE}
    _ts_starter
    printf '%s\\n' "\${COMPREPLY[@]}"
  `;
  const { stdout } = await run('bash', ['-c', script], {
    cwd,
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
  });
  return stdout.split('\n').filter(Boolean);
}

describe('bash completion script', () => {
  it('is valid bash', async () => {
    await run('bash', ['-c', `bash -n <(${process.execPath} ${index} completion bash)`]);
  });

  it('completes commands', async () => {
    expect(await tab('ts-starter ', await tempDir())).toEqual(['create', 'list', 'info', 'completion']);
    expect(await tab('ts-starter co', await tempDir())).toEqual(['completion']);
  });

  it('completes stamps and variants', async () => {
    const cwd = await tempDir();

    expect(await tab('ts-starter create ed', cwd)).toEqual(['editorconfig:go', 'editorconfig:ts']);
    expect(await tab('ts-starter info app:', cwd)).toEqual(['ts']);
    expect(await tab('ts-starter list ', cwd)).toEqual(expect.arrayContaining(['app', 'editorconfig', 'vitest']));
  });

  it('removes the part before the colon, which readline keeps', async () => {
    expect(await tab('ts-starter create editorconfig:', await tempDir())).toEqual(['go', 'ts']);
    expect(await tab('ts-starter create editorconfig:t', await tempDir())).toEqual(['ts']);
  });

  it('completes directories for the target', async () => {
    const cwd = await tempDir();
    await mkdir(path.join(cwd, 'projects'));
    await mkdir(path.join(cwd, 'other'));
    await writeFile(path.join(cwd, 'file.txt'), '');

    expect((await tab('ts-starter create app:ts ', cwd)).sort()).toEqual(['other', 'projects']);
    expect(await tab('ts-starter create app:ts pro', cwd)).toEqual(['projects']);
  });

  it('completes options and the shells', async () => {
    const cwd = await tempDir();

    expect(await tab('ts-starter create app:ts --d', cwd)).toEqual(['--dry-run']);
    expect(await tab('ts-starter completion ', cwd)).toEqual(['bash', 'zsh']);
  });
});
