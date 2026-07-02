/** Renders public/icon.svg to the PWA PNG set. Run `pnpm icons`; commit output. */
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

mkdirSync('public/icons', { recursive: true });
const jobs = [
  ['public/icons/icon-192.png', 192],
  ['public/icons/icon-512.png', 512],
  ['public/icons/apple-touch-icon.png', 180],
];
for (const [out, size] of jobs) {
  await sharp('public/icon.svg').resize(size, size).png().toFile(out);
  console.log(`${out} (${size}x${size})`);
}

// maskable: full-bleed background; art scaled into the ~80% safe zone so
// circular launcher masks never clip it.
const art = await sharp('public/icon.svg').resize(410, 410).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#0b1220' } })
  .composite([{ input: art, gravity: 'centre' }])
  .png()
  .toFile('public/icons/maskable-512.png');
console.log('public/icons/maskable-512.png (512x512, safe-zone)');
