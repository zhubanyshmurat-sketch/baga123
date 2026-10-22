/**
 * Generates the PNG icons (PWA, Apple touch icon, social preview) from the logo mark.
 * Run with:  npx tsx scripts/generate-icons.ts
 * The preview image uses Latin text only, so it does not depend on fonts with Cyrillic glyphs.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(__dirname, "..");

const mark = (size: number, rx = 10) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
  <defs><linearGradient id="g" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
    <stop stop-color="#2EB5A6"/><stop offset="1" stop-color="#8C7BEA"/></linearGradient></defs>
  <rect width="32" height="32" rx="${rx}" fill="url(#g)"/>
  <path d="M16 25V16" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
  <path d="M16 18c-5.2 0-7.6-3.6-7.6-7 4.6 0 7.6 2.6 7.6 7Z" fill="#fff"/>
  <path d="M16 15.5c0-4.4 2.6-7.4 7.6-7.4 0 4.6-3 7.4-7.6 7.4Z" fill="#fff" fill-opacity=".85"/>
</svg>`;

/** Maskable icons need the artwork inside the central 80% on a full-bleed background. */
const maskable = (size: number) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
  <defs><linearGradient id="g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
    <stop stop-color="#2EB5A6"/><stop offset="1" stop-color="#8C7BEA"/></linearGradient></defs>
  <rect width="32" height="32" fill="url(#g)"/>
  <g transform="translate(5.6 5.6) scale(.65)">
    <path d="M16 25V16" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
    <path d="M16 18c-5.2 0-7.6-3.6-7.6-7 4.6 0 7.6 2.6 7.6 7Z" fill="#fff"/>
    <path d="M16 15.5c0-4.4 2.6-7.4 7.6-7.4 0 4.6-3 7.4-7.6 7.4Z" fill="#fff" fill-opacity=".85"/>
  </g>
</svg>`;

const og = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
    <stop stop-color="#F7F8FC"/><stop offset="1" stop-color="#E3E0FB"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1010" cy="150" r="210" fill="#8C7BEA" fill-opacity=".22"/>
  <circle cx="1100" cy="520" r="170" fill="#2EB5A6" fill-opacity=".25"/>
  <g transform="translate(120 190)">${mark(150, 34).replace(/<\/?svg[^>]*>/g, "")}</g>
  <text x="120" y="450" font-family="Arial, Helvetica, sans-serif" font-size="96" font-weight="700" fill="#1F2A44">Student<tspan fill="#0B766B">Mind</tspan></text>
</svg>`;

async function png(svg: string, out: string, size?: [number, number]) {
  const file = path.join(root, out);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let img = sharp(Buffer.from(svg));
  if (size) img = img.resize(size[0], size[1]);
  await img.png().toFile(file);
  console.log("wrote", out);
}

async function main() {
  await png(mark(192), "public/icons/icon-192.png", [192, 192]);
  await png(mark(512), "public/icons/icon-512.png", [512, 512]);
  await png(maskable(512), "public/icons/maskable-512.png", [512, 512]);
  await png(maskable(180), "src/app/apple-icon.png", [180, 180]);
  await png(og, "public/og.png");
  // The favicon is the vector mark itself.
  fs.writeFileSync(path.join(root, "src/app/icon.svg"), mark(32).trim() + "\n");
  console.log("wrote src/app/icon.svg");
}

main();
