import { describe, expect, it, vi } from 'vitest';

import { answerPrompts, collectPrompts } from './prompts.js';

const prompt = (name, extra = {}) => ({ name, message: `${name}?`, type: 'input', ...extra });

describe('collectPrompts', () => {
  it('keeps the first position and the definition of the last stamp', () => {
    const stamps = [
      { prompts: [prompt('author'), prompt('name', { default: 'old' })] },
      { prompts: [prompt('name', { default: 'new' }), prompt('description')] },
    ];

    expect(collectPrompts(stamps)).toEqual([
      prompt('author'),
      prompt('name', { default: 'new' }),
      prompt('description'),
    ]);
  });
});

describe('answerPrompts', () => {
  it('prefers --set over defaults and asking', async () => {
    const ask = vi.fn();
    const answers = await answerPrompts([prompt('name', { default: 'x' })], { set: { name: 'given' }, yes: true, ask });

    expect(answers).toEqual({ name: 'given' });
    expect(ask).not.toHaveBeenCalled();
  });

  it('uses defaults with yes and asks for prompts without default', async () => {
    const ask = vi.fn(async (p) => `asked ${p.name}`);
    const answers = await answerPrompts([prompt('author', { default: 'me' }), prompt('name')], { yes: true, ask });

    expect(answers).toEqual({ author: 'me', name: 'asked name' });
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it('asks for everything without yes, even when there is a default', async () => {
    const ask = vi.fn(async () => 'typed');
    expect(await answerPrompts([prompt('author', { default: 'me' })], { ask })).toEqual({ author: 'typed' });
  });

  it('fails without a terminal and names the missing value', async () => {
    await expect(answerPrompts([prompt('name')], {})).rejects.toThrow(
      'No value for "name" (name?). Pass --set name=<value>',
    );
    await expect(answerPrompts([prompt('name', { default: 'x' })], {})).rejects.toThrow('or --yes to use the default');
  });

  it('rejects unknown --set keys and lists the available ones', async () => {
    await expect(answerPrompts([prompt('name')], { set: { nmae: 'x', foo: 'y' } })).rejects.toThrow(
      'Unknown values "nmae", "foo". Available: name',
    );
  });

  it('converts --set values of confirm prompts', async () => {
    const confirm = prompt('docs', { type: 'confirm' });

    expect(await answerPrompts([confirm], { set: { docs: 'false' } })).toEqual({ docs: false });
    await expect(answerPrompts([confirm], { set: { docs: 'maybe' } })).rejects.toThrow('must be true or false');
  });
});
