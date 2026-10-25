import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach } from 'vitest';

const tempDirs = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

/** Create a temporary directory that is removed after the test. */
export async function tempDir() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ts-starter-'));
  tempDirs.push(dir);
  return dir;
}

/**
 * Write a tree of files below `root`. A string value is the file content, an object is a sub directory.
 * @param {string} root
 * @param {Record<string, string | object>} tree
 */
export async function writeTree(root, tree) {
  await mkdir(root, { recursive: true });
  for (const [name, value] of Object.entries(tree)) {
    const target = path.join(root, name);
    if (typeof value === 'string') {
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, value);
    } else {
      await writeTree(target, value);
    }
  }
}

/**
 * Create a stamps directory from `{ 'name:variant': { manifest, files } }`.
 * @returns {Promise<string>} the stamps directory
 */
export async function makeStamps(definitions) {
  const root = path.join(await tempDir(), 'stamps');
  await mkdir(root, { recursive: true });
  for (const [id, { manifest, files = {} }] of Object.entries(definitions)) {
    const [name, variant] = id.split(':');
    await writeTree(path.join(root, name, variant), {
      'stamp.json': typeof manifest === 'string' ? manifest : JSON.stringify(manifest),
      files,
    });
  }
  return root;
}
