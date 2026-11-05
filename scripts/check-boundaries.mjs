// Fails the build if an import crosses a UI boundary:
// core may not import either UI, and the two UIs may not import each other.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const SRC = resolve('src');
const FORBIDDEN = {
  core: ['classic', 'terminal'],
  classic: ['terminal'],
  terminal: ['classic'],
};
const IMPORT = /(?:from\s+|import\s*\(\s*|import\s+|@import\s+(?:url\()?)['"](\.[^'"]+)['"]/g;

const violations = [];
for (const [area, forbidden] of Object.entries(FORBIDDEN)) {
  for (const entry of readdirSync(join(SRC, area), { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !/\.(tsx?|css)$/.test(entry.name)) continue;
    const file = join(entry.parentPath, entry.name);
    for (const [, specifier] of readFileSync(file, 'utf8').matchAll(IMPORT)) {
      const target = relative(SRC, resolve(dirname(file), specifier)).split(/[\\/]/)[0];
      if (forbidden.includes(target)) {
        violations.push(`${relative('.', file)}: ${area} must not import ${target} ("${specifier}")`);
      }
    }
  }
}

if (violations.length) {
  console.error(`Import boundary violations:\n  ${violations.join('\n  ')}`);
  process.exit(1);
}
