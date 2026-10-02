/**
 * Dependency-free PNG writer + PWA icon generator.
 *
 * Why hand-rolled: the production icon must be derived from the *approved*
 * Classora logo, and this script is the only thing allowed to produce app
 * icons. It uses `sharp` when installed (best quality resampling), and falls
 * back to writing a neutral porcelain placeholder so the app stays installable
 * before the artwork is wired in.
 *
 *   node scripts/generate-icons.mjs            # uses public/branding/logo.png
 *   node scripts/generate-icons.mjs --check    # verifies icons exist (CI)
 *
 * Once the official file lands in `public/branding/`, run:
 *   npm i -D sharp && npm run icons
 * and every icon below is regenerated from it. The placeholder is deliberately
 * a plain brand-coloured square: it is not a logo, and it is never a redraw of
 * one.
 */
import { deflateSync } from 'node:zlib';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'public/icons');
const brandingDir = resolve(root, 'public/branding');

const SOURCE_CANDIDATES = [
  'logo.png',
  'classora-logo.png',
  'classora-logo-transparent.png',
  'mark.png',
  'classora-mark.png',
];

/** Indigo, matching `brand-600` in tailwind.config.ts. */
const PLACEHOLDER = { r: 79, g: 70, b: 229 };
const PORCELAIN = { r: 245, g: 245, b: 247 };

const SIZES = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'maskable-192.png', size: 192, maskable: true },
  { file: 'maskable-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: false },
  { file: 'favicon-32.png', size: 32, maskable: false },
];

/* ------------------------------------------------------------------ *
 * Minimal PNG encoder (RGBA, 8-bit, no interlace)                      *
 * ------------------------------------------------------------------ */

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

/** pixels: Uint8Array of RGBA, length = width * height * 4 */
function encodePng(width, height, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  header[10] = 0; // deflate
  header[11] = 0; // adaptive filtering
  header[12] = 0; // no interlace

  // Each scanline is prefixed with its filter type (0 = none).
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(pixels.buffer, pixels.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    );
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------ *
 * Placeholder artwork                                                  *
 * ------------------------------------------------------------------ */

/** Rounded-square brand tile on the porcelain canvas. */
function placeholderPixels(size, maskable) {
  const pixels = new Uint8Array(size * size * 4);
  // Maskable icons must survive an aggressive circular crop, so the tile is
  // inset inside the safe zone instead of filling the canvas.
  const inset = maskable ? Math.round(size * 0.14) : 0;
  const radius = maskable ? Math.round(size * 0.24) : Math.round(size * 0.22);
  const inner = size - inset * 2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const inTile =
        x >= inset && y >= inset && x < size - inset && y < size - inset;

      if (!inTile) {
        // Outside the tile: transparent for maskable, porcelain otherwise.
        if (maskable) {
          pixels[index + 3] = 0;
        } else {
          pixels[index] = PORCELAIN.r;
          pixels[index + 1] = PORCELAIN.g;
          pixels[index + 2] = PORCELAIN.b;
          pixels[index + 3] = 255;
        }
        continue;
      }

      // Distance to the nearest tile corner decides rounded-corner coverage.
      const localX = x - inset;
      const localY = y - inset;
      const dx = Math.max(radius - localX, localX - (inner - radius), 0);
      const dy = Math.max(radius - localY, localY - (inner - radius), 0);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > radius) {
        if (maskable) {
          pixels[index + 3] = 0;
        } else {
          pixels[index] = PORCELAIN.r;
          pixels[index + 1] = PORCELAIN.g;
          pixels[index + 2] = PORCELAIN.b;
          pixels[index + 3] = 255;
        }
        continue;
      }

      pixels[index] = PLACEHOLDER.r;
      pixels[index + 1] = PLACEHOLDER.g;
      pixels[index + 2] = PLACEHOLDER.b;
      pixels[index + 3] = 255;
    }
  }

  return pixels;
}

/* ------------------------------------------------------------------ *
 * Generator                                                            *
 * ------------------------------------------------------------------ */

function findSource() {
  for (const candidate of SOURCE_CANDIDATES) {
    const path = resolve(brandingDir, candidate);
    if (existsSync(path)) return path;
  }
  return null;
}

async function loadSharp() {
  try {
    const sharp = await import('sharp');
    return sharp.default ?? sharp;
  } catch {
    return null;
  }
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  mkdirSync(outDir, { recursive: true });

  if (checkOnly) {
    const missing = SIZES.filter(({ file }) => !existsSync(resolve(outDir, file)));
    if (missing.length > 0) {
      console.error(`Missing PWA icons: ${missing.map((item) => item.file).join(', ')}`);
      process.exitCode = 1;
      return;
    }
    console.log('All PWA icons present.');
    return;
  }

  const source = findSource();
  const sharp = source ? await loadSharp() : null;

  if (source && sharp) {
    for (const { file, size, maskable } of SIZES) {
      const pipeline = sharp(source).resize(size, size, {
        fit: maskable ? 'contain' : 'cover',
        background: maskable ? { r: 0, g: 0, b: 0, alpha: 0 } : { ...PORCELAIN, alpha: 1 },
      });
      await pipeline.png().toFile(resolve(outDir, file));
      console.log(`${file} ← ${file.replace(/.*/, source.split('/').pop())} (${size}px)`);
    }
    writeFileSync(
      resolve(outDir, 'SOURCE.txt'),
      `Generated from ${source.split('/').pop()} on ${new Date().toISOString()}\n`,
    );
    return;
  }

  if (source && !sharp) {
    console.warn(
      `Found ${source} but \`sharp\` is not installed. Run \`npm i -D sharp\` to generate icons from the real logo.`,
    );
  } else {
    console.warn(
      'No branding source found in public/branding/ — writing neutral placeholder icons.\n' +
        'Drop the approved logo in as public/branding/logo.png and run `npm i -D sharp && npm run icons`.',
    );
  }

  for (const { file, size, maskable } of SIZES) {
    const png = encodePng(size, size, placeholderPixels(size, maskable));
    writeFileSync(resolve(outDir, file), png);
    console.log(`${file} ← placeholder (${size}px)`);
  }
  writeFileSync(
    resolve(outDir, 'SOURCE.txt'),
    `PLACEHOLDER icons generated ${new Date().toISOString()}.\nReplace by adding public/branding/logo.png and running \`npm run icons\`.\n`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

export { encodePng, placeholderPixels, SIZES };
