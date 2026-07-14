import { spawn } from 'node:child_process';
import { copyFile, mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createIco } from './windows-icon-format.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceSvg = path.join(rootDir, 'src', 'assets', 'brand', 'netraflow-logo.svg');
const macosSourceSvg = path.join(rootDir, 'public', 'icons', 'netraflow-macos.svg');
const iconsDir = path.join(rootDir, 'public', 'icons');
const linuxIconsDir = path.join(iconsDir, 'linux');
const macosPreviewPath = path.join(rootDir, 'docs', 'assets', 'netraflow-macos-icon-preview.png');
const rasterSizes = [16, 20, 24, 32, 40, 48, 64, 128, 256, 512, 1024];
const icoSizes = [16, 20, 24, 32, 40, 48, 64, 128, 256];
const icnsEntries = [
  [16, 'icp4'],
  [32, 'icp5'],
  [64, 'icp6'],
  [128, 'ic07'],
  [256, 'ic08'],
  [512, 'ic09'],
  [1024, 'ic10']
];
const iconsetEntries = [
  ['icon_16x16.png', 16],
  ['icon_16x16@2x.png', 32],
  ['icon_32x32.png', 32],
  ['icon_32x32@2x.png', 64],
  ['icon_128x128.png', 128],
  ['icon_128x128@2x.png', 256],
  ['icon_256x256.png', 256],
  ['icon_256x256@2x.png', 512],
  ['icon_512x512.png', 512],
  ['icon_512x512@2x.png', 1024]
];

const run = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with code ${code ?? 'unknown'}`));
    });
  });

const pngPathFor = (renderRoot, size, sourcePath) =>
  path.join(renderRoot, String(size), `${path.basename(sourcePath)}.png`);

const createIcns = (entries) => {
  const chunks = entries.map(({ type, data }) => {
    const header = Buffer.alloc(8);
    header.write(type, 0, 'ascii');
    header.writeUInt32BE(data.length + header.length, 4);
    return Buffer.concat([header, data]);
  });
  const header = Buffer.alloc(8);
  header.write('icns', 0, 'ascii');
  header.writeUInt32BE(header.length + chunks.reduce((sum, chunk) => sum + chunk.length, 0), 4);
  return Buffer.concat([header, ...chunks]);
};

const createPreviewSvg = (svg) => {
  const source = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  const pairs = [[16, 20], [24, 32], [40, 48], [64, 128], [256, 512], [1024]];
  const panel = (offset, background, textColor) => {
    const cells = pairs.flatMap((pair, row) =>
      pair.map((size, column) => {
        const centerX = offset + (column === 0 ? 225 : 675);
        const centerY = 170 + row * 280;
        const displaySize = Math.min(200, Math.max(92, size * 3));
        const imageX = centerX - displaySize / 2;
        const imageY = centerY - displaySize / 2 + 30;
        return `<text x="${centerX}" y="${centerY - 130}" fill="${textColor}" font-size="20" text-anchor="middle">${size}×${size}</text><image href="${source}" x="${imageX}" y="${imageY}" width="${displaySize}" height="${displaySize}"/>`;
      })
    ).join('');
    return `<rect x="${offset}" width="900" height="1800" fill="${background}"/>${cells}`;
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1800" viewBox="0 0 1800 1800"><g font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="600">${panel(0, '#f3f5f8', '#182536')}${panel(900, '#101820', '#e8edf1')}<text x="450" y="55" fill="#182536" font-size="30" text-anchor="middle">Light background</text><text x="1350" y="55" fill="#e8edf1" font-size="30" text-anchor="middle">Dark background</text></g></svg>`;
};

const main = async () => {
  await stat(sourceSvg);
  await stat(macosSourceSvg);
  await copyFile(sourceSvg, path.join(iconsDir, 'netraflow.svg'));
  const workDir = await mkdtemp(path.join(os.tmpdir(), 'netraflow-icons-'));
  const renderRoot = path.join(workDir, 'rendered');
  const macosRenderRoot = path.join(workDir, 'macos-rendered');
  const iconsetDir = path.join(workDir, 'netraflow.iconset');

  try {
    await mkdir(renderRoot, { recursive: true });
    await mkdir(macosRenderRoot, { recursive: true });
    await mkdir(iconsetDir, { recursive: true });
    await mkdir(linuxIconsDir, { recursive: true });

    for (const size of rasterSizes) {
      const outputDir = path.join(renderRoot, String(size));
      await mkdir(outputDir, { recursive: true });
      await run('qlmanage', ['-t', '-s', String(size), '-o', outputDir, sourceSvg]);
      await stat(pngPathFor(renderRoot, size, sourceSvg));
      await copyFile(
        pngPathFor(renderRoot, size, sourceSvg),
        path.join(linuxIconsDir, `${size}x${size}.png`)
      );
    }

    for (const size of new Set(iconsetEntries.map(([, iconSize]) => iconSize))) {
      const outputDir = path.join(macosRenderRoot, String(size));
      await mkdir(outputDir, { recursive: true });
      await run('qlmanage', ['-t', '-s', String(size), '-o', outputDir, macosSourceSvg]);
    }

    for (const [filename, size] of iconsetEntries) {
      await copyFile(
        pngPathFor(macosRenderRoot, size, macosSourceSvg),
        path.join(iconsetDir, filename)
      );
    }

    const icoEntries = await Promise.all(
      icoSizes.map(async (size) => ({
        size,
        data: await readFile(pngPathFor(renderRoot, size, sourceSvg))
      }))
    );
    await writeFile(path.join(iconsDir, 'netraflow.ico'), createIco(icoEntries));

    const icnsData = await Promise.all(
      icnsEntries.map(async ([size, type]) => ({
        type,
        data: await readFile(pngPathFor(macosRenderRoot, size, macosSourceSvg))
      }))
    );
    await writeFile(path.join(iconsDir, 'netraflow.icns'), createIcns(icnsData));

    const previewSvgPath = path.join(workDir, 'netraflow-macos-icon-preview.svg');
    const previewOutputDir = path.join(workDir, 'preview');
    await mkdir(previewOutputDir, { recursive: true });
    await writeFile(previewSvgPath, createPreviewSvg(await readFile(macosSourceSvg, 'utf8')));
    await run('qlmanage', ['-t', '-s', '1800', '-o', previewOutputDir, previewSvgPath]);
    await copyFile(
      path.join(previewOutputDir, 'netraflow-macos-icon-preview.svg.png'),
      macosPreviewPath
    );
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
