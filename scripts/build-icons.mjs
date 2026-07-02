/** Renders public/icon.svg to the PWA PNG set. Run `pnpm icons`; commit output. */
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

mkdirSync('public/icons', { recursive: true });
const jobs = [
  ['public/icons/icon-192.png', 192],
  ['public/icons/icon-512.png', 512],
  ['public/icons/maskable-512.png', 512],
];
for (const [out, size] of jobs) {
  await sharp('public/icon.svg').resize(size, size).png().toFile(out);
  console.log(`${out} (${size}x${size})`);
}
