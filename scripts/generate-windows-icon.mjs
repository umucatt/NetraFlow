import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import electronPath from 'electron';

import { createIco, inspectIco } from './windows-icon-format.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceSvg = path.join(rootDir, 'src', 'assets', 'brand', 'netraflow-logo.svg');
const outputIco = path.join(rootDir, 'public', 'icons', 'netraflow.ico');
const rendererScript = path.join(rootDir, 'scripts', 'render-windows-icon.mjs');
const icoSizes = [16, 20, 24, 32, 40, 48, 64, 128, 256];

const runElectronRenderer = (outputDirectory) =>
  new Promise((resolve, reject) => {
    const environment = { ...process.env };
    delete environment.ELECTRON_RUN_AS_NODE;

    const child = spawn(
      electronPath,
      [rendererScript, sourceSvg, outputDirectory, icoSizes.join(',')],
      {
        env: environment,
        stdio: 'inherit',
        windowsHide: true
      }
    );
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Electron Windows icon renderer exited with code ${code ?? 'unknown'}.`));
    });
  });

const main = async () => {
  await stat(sourceSvg);
  await stat(rendererScript);
  const svg = await readFile(sourceSvg, 'utf8');
  if (!/<svg\b[^>]*\bviewBox=(['"])[^'"]+\1[^>]*>/s.test(svg) || !/<\/svg>\s*$/s.test(svg)) {
    throw new Error('Canonical NetraFlow brand SVG is not a complete parseable SVG document.');
  }

  const workDirectory = await mkdtemp(path.join(os.tmpdir(), 'netraflow-windows-icon-'));
  try {
    await runElectronRenderer(workDirectory);
    const entries = await Promise.all(
      icoSizes.map(async (size) => ({
        size,
        data: await readFile(path.join(workDirectory, `${size}.png`))
      }))
    );
    const ico = createIco(entries);
    inspectIco(ico, icoSizes);
    await writeFile(outputIco, ico);
    inspectIco(await readFile(outputIco), icoSizes);
  } finally {
    await rm(workDirectory, { recursive: true, force: true });
  }

  console.log(
    `Generated ${path.relative(rootDir, outputIco)} with RGBA layers: ${icoSizes.join(', ')}.`
  );
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
