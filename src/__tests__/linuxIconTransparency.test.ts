/// <reference types="node" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import test from 'node:test';
import { inflateSync } from 'node:zlib';

const sizes = [16, 20, 24, 32, 40, 48, 64, 128, 256, 512, 1024];

const decodeRgbaPng = (filePath: string) => {
  const png = readFileSync(filePath);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  let offset = 8;
  let width = 0;
  let height = 0;
  const compressed: Buffer[] = [];

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      assert.equal(data[8], 8);
      assert.equal(data[9], 6);
      assert.equal(data[12], 0);
    } else if (type === 'IDAT') {
      compressed.push(data);
    }
    offset += 12 + length;
  }

  const raw = inflateSync(Buffer.concat(compressed));
  const stride = width * 4;
  const pixels = Buffer.alloc(stride * height);
  let inputOffset = 0;
  const paeth = (a: number, b: number, c: number) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };

  for (let y = 0; y < height; y += 1) {
    const filter = raw[inputOffset++];
    for (let x = 0; x < stride; x += 1) {
      const value = raw[inputOffset++];
      const left = x >= 4 ? pixels[y * stride + x - 4] : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const upperLeft = y > 0 && x >= 4 ? pixels[(y - 1) * stride + x - 4] : 0;
      const reconstructed =
        filter === 0 ? value :
        filter === 1 ? value + left :
        filter === 2 ? value + up :
        filter === 3 ? value + Math.floor((left + up) / 2) :
        filter === 4 ? value + paeth(left, up, upperLeft) :
        NaN;
      assert.equal(Number.isNaN(reconstructed), false);
      pixels[y * stride + x] = reconstructed & 0xff;
    }
  }

  return { width, height, pixels };
};

test('every Linux install icon has transparent corners and a useful content scale', () => {
  for (const size of sizes) {
    const filePath = path.join(process.cwd(), 'public', 'icons', 'linux', `${size}x${size}.png`);
    const { width, height, pixels } = decodeRgbaPng(filePath);
    assert.equal(width, size);
    assert.equal(height, size);
    const alphaAt = (x: number, y: number) => pixels[(y * width + x) * 4 + 3];
    assert.deepEqual([
      alphaAt(0, 0),
      alphaAt(width - 1, 0),
      alphaAt(0, height - 1),
      alphaAt(width - 1, height - 1)
    ], [0, 0, 0, 0]);

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let translucentPixels = 0;
    let opaqueWhitePixels = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const alpha = alphaAt(x, y);
        if (alpha > 0 && alpha < 255) translucentPixels += 1;
        const offset = (y * width + x) * 4;
        if (
          alpha === 255 &&
          pixels[offset] === 255 &&
          pixels[offset + 1] === 255 &&
          pixels[offset + 2] === 255
        ) opaqueWhitePixels += 1;
        if (alpha < 16) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    assert.ok(maxX >= minX && maxY >= minY);
    assert.ok((maxX - minX + 1) / width >= 0.85);
    assert.ok((maxY - minY + 1) / height >= 0.85);
    assert.ok(translucentPixels >= Math.max(4, Math.floor(size * 0.5)));
    assert.ok(opaqueWhitePixels < width * height * 0.4);
  }
});

test('Linux icons are reproducibly generated from the controlled SVG without changing platform assets', () => {
  const generator = readFileSync(path.join(process.cwd(), 'scripts', 'generate-linux-icons.mjs'), 'utf8');
  assert.equal(generator.includes("'public', 'icons', 'netraflow.svg'"), true);
  assert.equal(generator.includes('gdk-pixbuf-csource'), true);
  assert.equal(generator.includes('lanczos'), true);
  assert.equal(generator.includes('normalizedAlpha'), true);
  const sha256 = (filePath: string) => createHash('sha256').update(readFileSync(filePath)).digest('hex');
  assert.equal(sha256(path.join(process.cwd(), 'public/icons/netraflow.ico')), '36d4bd56127ac789e6194b8c84ba43e126a44262f5957f3a1e7f5989fe8658c1');
  assert.equal(sha256(path.join(process.cwd(), 'public/icons/netraflow.icns')), '553f1d11cdd364b1e3d945578929ecae431f657f25f86049ec0ac62bd6f16a03');
});

test('DEB packaging installs every controlled Linux icon without substituting assets', () => {
  const packaging = readFileSync(path.join(process.cwd(), 'scripts', 'package-deb.mjs'), 'utf8');
  assert.equal(packaging.includes('copyFileSync(path.join(iconDir, `${size}x${size}.png`), destination)'), true);
  assert.equal(packaging.includes('/usr/share/icons/hicolor/${size}x${size}/apps/netraflow.png'), true);
});
