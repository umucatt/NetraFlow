import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { deflateSync } from 'node:zlib';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'src', 'assets', 'brand', 'netraflow-logo.svg');
const publicSvgPath = path.join(root, 'public', 'icons', 'netraflow.svg');
const outputDirectory = path.join(root, 'public', 'icons', 'linux');
const sizes = [16, 20, 24, 32, 40, 48, 64, 128, 256, 512, 1024];

const rendered = spawnSync(
  'gdk-pixbuf-csource',
  ['--raw', '--struct', '--name=netraflow_icon', sourcePath],
  { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
);
if (rendered.status !== 0) {
  throw new Error(rendered.stderr || 'gdk-pixbuf-csource failed');
}

const header = rendered.stdout.match(/(\d+), \/\* rowstride \*\/\s+(\d+), \/\* width \*\/\s+(\d+), \/\* height \*\//);
if (!header) throw new Error('Unable to read GDK RGBA source dimensions');
const [, rowstrideText, widthText, heightText] = header;
const sourceWidth = Number(widthText);
const sourceHeight = Number(heightText);
const rowstride = Number(rowstrideText);
if (sourceWidth !== 1024 || sourceHeight !== 1024 || rowstride !== sourceWidth * 4) {
  throw new Error('Brand SVG did not render as the expected 1024px RGBA source');
}

const pixelSection = rendered.stdout.slice(rendered.stdout.indexOf('/* pixel_data: */'));
const literals = [...pixelSection.matchAll(/"((?:\\.|[^"\\])*)"/gs)];
const bytes = [];
for (const [, literal] of literals) {
  for (let index = 0; index < literal.length; index += 1) {
    if (literal[index] !== '\\') {
      bytes.push(literal.charCodeAt(index));
      continue;
    }
    index += 1;
    const escaped = literal[index];
    if (/[0-7]/.test(escaped)) {
      let octal = escaped;
      while (octal.length < 3 && /[0-7]/.test(literal[index + 1] ?? '')) {
        octal += literal[++index];
      }
      bytes.push(Number.parseInt(octal, 8));
    } else {
      bytes.push(({ n: 10, r: 13, t: 9, '\\': 92, '"': 34 })[escaped] ?? escaped.charCodeAt(0));
    }
  }
}
const source = Buffer.from(bytes);
if (source.length !== sourceWidth * sourceHeight * 4) {
  throw new Error(`Unexpected GDK RGBA byte count: ${source.length}`);
}

const sinc = (value) => value === 0 ? 1 : Math.sin(Math.PI * value) / (Math.PI * value);
const lanczos = (value, radius = 3) => Math.abs(value) < radius ? sinc(value) * sinc(value / radius) : 0;

const resize = (size) => {
  if (size === sourceWidth) return Buffer.from(source);
  const scale = sourceWidth / size;
  const radius = 3;
  const output = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    const sourceY = (y + 0.5) * scale - 0.5;
    const minY = Math.max(0, Math.floor(sourceY - radius * scale));
    const maxY = Math.min(sourceHeight - 1, Math.ceil(sourceY + radius * scale));
    for (let x = 0; x < size; x += 1) {
      const sourceX = (x + 0.5) * scale - 0.5;
      const minX = Math.max(0, Math.floor(sourceX - radius * scale));
      const maxX = Math.min(sourceWidth - 1, Math.ceil(sourceX + radius * scale));
      let weightTotal = 0;
      let alpha = 0;
      let red = 0;
      let green = 0;
      let blue = 0;
      for (let sy = minY; sy <= maxY; sy += 1) {
        const wy = lanczos((sourceY - sy) / scale, radius);
        for (let sx = minX; sx <= maxX; sx += 1) {
          const weight = wy * lanczos((sourceX - sx) / scale, radius);
          if (weight === 0) continue;
          const offset = (sy * sourceWidth + sx) * 4;
          const normalizedAlpha = source[offset + 3] / 255;
          weightTotal += weight;
          alpha += normalizedAlpha * weight;
          red += source[offset] * normalizedAlpha * weight;
          green += source[offset + 1] * normalizedAlpha * weight;
          blue += source[offset + 2] * normalizedAlpha * weight;
        }
      }
      const offset = (y * size + x) * 4;
      const normalizedAlpha = Math.max(0, Math.min(1, alpha / weightTotal));
      const alphaByte = Math.round(normalizedAlpha * 255);
      output[offset + 3] = alphaByte <= 3 ? 0 : alphaByte;
      if (normalizedAlpha > 0) {
        output[offset] = Math.round(Math.max(0, Math.min(255, red / weightTotal / normalizedAlpha)));
        output[offset + 1] = Math.round(Math.max(0, Math.min(255, green / weightTotal / normalizedAlpha)));
        output[offset + 2] = Math.round(Math.max(0, Math.min(255, blue / weightTotal / normalizedAlpha)));
      }
    }
  }
  return output;
};

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});
const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const name = Buffer.from(type);
  const output = Buffer.alloc(data.length + 12);
  output.writeUInt32BE(data.length, 0);
  name.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8);
  return output;
};
const encodePng = (size, pixels) => {
  const headerData = Buffer.alloc(13);
  headerData.writeUInt32BE(size, 0);
  headerData.writeUInt32BE(size, 4);
  headerData.set([8, 6, 0, 0, 0], 8);
  const scanlines = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) pixels.copy(scanlines, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', headerData),
    chunk('IDAT', deflateSync(scanlines, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
};

mkdirSync(outputDirectory, { recursive: true });
copyFileSync(sourcePath, publicSvgPath);
readFileSync(sourcePath);
for (const size of sizes) {
  writeFileSync(path.join(outputDirectory, `${size}x${size}.png`), encodePng(size, resize(size)));
}
