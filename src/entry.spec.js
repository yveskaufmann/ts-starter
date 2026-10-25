import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

const run = promisify(execFile);
const index = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.js');

describe('index.js', () => {
  it('prints the version', async () => {
    const { stdout } = await run(process.execPath, [index, '--version']);

    expect(stdout).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('exits with the code of the command', async () => {
    await expect(run(process.execPath, [index, 'nope'])).rejects.toMatchObject({ code: 2 });
  });

  it('stays quiet when the reader of stdout has gone away', async () => {
    // `true` exits at once without reading, so writing the list hits a closed pipe
    const { stdout, stderr } = await run('bash', ['-c', `"${process.execPath}" "${index}" list | true`]);

    expect(stdout).toBe('');
    expect(stderr).toBe('');
  });
});
