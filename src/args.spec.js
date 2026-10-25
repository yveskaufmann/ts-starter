import { describe, expect, it } from 'vitest';

import { parseArguments } from './args.js';
import { UsageError } from './errors.js';

describe('parseArguments', () => {
  it('parses a create command with its options', () => {
    const parsed = parseArguments(['create', 'app:ts', 'demo', '--yes', '--set', 'a=1', '--set', 'b=x=y', '--dry-run']);

    expect(parsed).toMatchObject({
      command: 'create',
      positionals: ['app:ts', 'demo'],
      options: { yes: true, dryRun: true, force: false, skipExisting: false, set: { a: '1', b: 'x=y' } },
    });
  });

  it('keeps "." and options in any position', () => {
    expect(parseArguments(['create', '--force', 'app:ts', '.']).positionals).toEqual(['app:ts', '.']);
  });

  it('returns help and version without validating the rest', () => {
    expect(parseArguments(['--help']).help).toBe(true);
    expect(parseArguments(['create', '-h']).help).toBe(true);
    expect(parseArguments(['-v']).version).toBe(true);
    expect(parseArguments([]).command).toBeUndefined();
  });

  it.each([
    [['nope'], 'Unknown command "nope". Available commands: create, list, info'],
    [['create', '--unknown'], 'Unknown option'],
    [['list', '--force'], 'The option --force is not supported by "list"'],
    [['create', 'a:b', 'c', 'd'], 'Unexpected argument "d"'],
    [['create', 'a:b', '--force', '--skip-existing'], 'cannot be combined'],
    [['create', 'a:b', '--set', 'novalue'], 'expected key=value'],
    [['create', 'a:b', '--set', '=x'], 'expected key=value'],
  ])('rejects %j', (argv, message) => {
    expect(() => parseArguments(argv)).toThrow(UsageError);
    expect(() => parseArguments(argv)).toThrow(message);
  });
});
