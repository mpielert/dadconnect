// Generates the PWA / home-screen icons from an on-brand SVG.
// Run once (and whenever the mark changes): `node scripts/gen-icons.mjs`.
// Requires the `sharp` devDependency.
import sharp from "sharp";
import { mkdirSync } from "node:fs";

// Two interlocking rings (a "connection") in cardinal + brass on ink —
// the §5 palette. No text, so it renders crisply at every size.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#202A26"/>
  <circle cx="205" cy="256" r="104" fill="none" stroke="#9C2B2F" stroke-width="34"/>
  <circle cx="307" cy="256" r="104" fill="none" stroke="#AD8A4E" stroke-width="34"/>
</svg>`;

const out = new URL("../public/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });

const targets = [
  ["icon-512.png", 512],
  ["icon-192.png", 192],
  ["apple-touch-icon.png", 180], // iOS "Add to Home Screen"
  ["favicon-32.png", 32],
];

for (const [name, size] of targets) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(out + name);
  console.log(`wrote public/${name} (${size}x${size})`);
}
