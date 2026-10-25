import { execFile, execFileSync } from 'node:child_process';
import { chmod, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

import { tempDir } from '../stamps/test-helpers.js';

const run = promisify(execFile);
const index = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'index.js');

const hasZsh = (() => {
  try {
    execFileSync('zsh', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

/**
 * Source the generated script in zsh with `compadd` and `_files` replaced by stubs that print what they receive,
 * and run the completion function for `line` as if the cursor was at its end.
 */
async function tab(line) {
  const bin = await tempDir();
  const wrapper = path.join(bin, 'ts-starter');
  await writeFile(wrapper, `#!/bin/sh\nexec "${process.execPath}" "${index}" "$@"\n`);
  await chmod(wrapper, 0o755);

  const script = `
    export PATH=${bin}:$PATH
    compdef() { :; }
    compadd() { shift; [[ $1 == -- ]] && shift; print -l -- "$@"; }
    _files() { echo "files $*"; }
    source <(ts-starter completion zsh)
    words=(\${=LINE}); [[ $LINE == *" " ]] && words+=("")
    CURRENT=\${#words}
    _ts_starter
  `;
  const { stdout } = await run('zsh', ['-f', '-c', script], { env: { ...process.env, LINE: line } });
  return stdout.split('\n').filter(Boolean);
}

describe.skipIf(!hasZsh)('zsh completion script', () => {
  it('is valid zsh', async () => {
    await run('zsh', ['-c', `zsh -n <(${process.execPath} ${index} completion zsh)`]);
  });

  it('completes commands, stamps with variants and shells', async () => {
    expect(await tab('ts-starter ')).toEqual(['create', 'list', 'info', 'completion']);
    expect(await tab('ts-starter create ed')).toEqual(['editorconfig:go', 'editorconfig:ts']);
    expect(await tab('ts-starter create editorconfig:g')).toEqual(['editorconfig:go']);
    expect(await tab('ts-starter completion ')).toEqual(['bash', 'zsh']);
  });

  it('completes directories for the target and the keys of --set', async () => {
    expect(await tab('ts-starter create app:ts ')).toEqual(['files -/']);
    expect(await tab('ts-starter create app:ts --set ')).toEqual(['author=', 'description=', 'name=']);
  });
});
