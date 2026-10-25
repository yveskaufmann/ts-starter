import { UsageError } from '../errors.js';
import { collectPrompts, listStampFiles, parseStampId } from '../stamps/index.js';

/**
 * ts-starter info <stamp>:<variant>
 * @returns {Promise<number>} exit code
 */
export async function info({ positionals, registry, env }) {
  const [spec] = positionals;
  if (!spec) {
    throw new UsageError('Missing stamp, for example: ts-starter info app:ts');
  }
  const { name, variant } = parseStampId(spec);
  if (!variant) {
    throw new UsageError(
      `Missing variant, use ${
        registry
          .variants(name)
          .map((value) => `${name}:${value}`)
          .join(' or ') || `${name}:<variant>`
      }`,
    );
  }

  const stamp = registry.get(name, variant);
  const stamps = registry.flatten(stamp);
  const out = env.stdout;

  out.write(`${stamp.id} (${stamp.mode})\n${stamp.description}\n`);

  const prompts = collectPrompts(stamps);
  if (prompts.length > 0) {
    out.write('\nValues (--set key=value):\n');
    for (const prompt of prompts) {
      const fallback = prompt.default === undefined ? '' : ` [default: ${prompt.default}]`;
      out.write(`  ${prompt.name.padEnd(14)} ${prompt.message}${fallback}\n`);
    }
  }

  if (stamps.length > 1) {
    out.write(
      `\nIncludes: ${stamps
        .filter((included) => included !== stamp)
        .map((included) => included.id)
        .join(', ')}\n`,
    );
  }

  out.write('\nFiles:\n');
  for (const included of stamps) {
    for (const file of await listStampFiles(included)) {
      out.write(`  ${file}${included === stamp ? '' : `  (${included.id})`}\n`);
    }
  }
  return 0;
}
