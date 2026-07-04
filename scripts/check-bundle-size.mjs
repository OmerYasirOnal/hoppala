import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const DIST = 'dist';
const LIMIT = 60 * 1024;
const manifest = JSON.parse(readFileSync(join(DIST, '.vite/manifest.json'), 'utf8'));

const entryKey = Object.keys(manifest).find((k) => manifest[k].isEntry);
if (!entryKey) {
  console.error('✗ no entry chunk found in dist/.vite/manifest.json');
  process.exit(1);
}

// Walk STATIC imports only (chunk.imports); never follow chunk.dynamicImports.
const files = new Set();
const seen = new Set();
(function walk(key) {
  const chunk = manifest[key];
  if (!chunk || seen.has(key)) return;
  seen.add(key);
  files.add(chunk.file);
  for (const css of chunk.css ?? []) files.add(css);
  for (const imp of chunk.imports ?? []) walk(imp);
})(entryKey);

let total = 0;
for (const f of files) {
  const size = gzipSync(readFileSync(join(DIST, f))).length;
  total += size;
  console.log(`  ${f} ${(size / 1024).toFixed(1)}KB`);
}

const kb = (total / 1024).toFixed(1);
if (total > LIMIT) {
  console.error(`✗ core payload ${kb}KB gzip exceeds 60KB budget`);
  process.exit(1);
}
console.log(`✓ core payload ${kb}KB gzip (< 60KB) — firebase/capacitor lazy chunks excluded by static closure`);
