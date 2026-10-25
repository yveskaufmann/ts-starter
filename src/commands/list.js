import { StampError } from '../stamps/index.js';

/**
 * ts-starter list [stamp] [--json]
 * @returns {Promise<number>} exit code
 */
export async function list({ positionals, options, registry, env }) {
  const [name] = positionals;
  if (name && registry.variants(name).length === 0) {
    throw new StampError(`Unknown stamp "${name}". Available stamps: ${registry.names().join(', ') || 'none'}`);
  }

  const stamps = registry.all().filter((stamp) => !name || stamp.name === name);
  if (options.json) {
    const data = stamps.map(({ id, name: stampName, variant, description, mode }) => ({
      id,
      name: stampName,
      variant,
      description,
      mode,
    }));
    env.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
    return 0;
  }

  const width = Math.max(0, ...stamps.map((stamp) => stamp.id.length));
  for (const stamp of stamps) {
    env.stdout.write(`${stamp.id.padEnd(width)}  ${stamp.mode.padEnd(7)}  ${stamp.description}\n`);
  }
  return 0;
}
