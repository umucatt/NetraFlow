import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { app, BrowserWindow } from 'electron';

import { inspectRgbaPng } from './windows-icon-format.mjs';

const [sourcePath, outputDirectory, sizesText] = process.argv.slice(2);
const sizes = sizesText?.split(',').map(Number) ?? [];

app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.disableHardwareAcceleration();

const main = async () => {
  if (!sourcePath || !outputDirectory || sizes.some((size) => !Number.isInteger(size))) {
    throw new Error('Windows icon renderer received invalid arguments.');
  }

  const svg = await readFile(sourcePath, 'utf8');
  const sourceUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

  await app.whenReady();

  const renderWindow = new BrowserWindow({
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    width: 256,
    height: 256,
    useContentSize: true,
    webPreferences: {
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  try {
    await renderWindow.loadURL(
      'data:text/html;charset=utf-8,' +
        encodeURIComponent(
          '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}</style>'
        )
    );

    const rendered = await renderWindow.webContents.executeJavaScript(
      `(async () => {
        const sourceUrl = ${JSON.stringify(sourceUrl)};
        const sizes = ${JSON.stringify(sizes)};
        const layers = [];

        for (const size of sizes) {
          const image = new Image();
          image.src = sourceUrl;
          await image.decode();

          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const context = canvas.getContext('2d', { alpha: true });
          context.clearRect(0, 0, size, size);
          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = 'high';
          context.drawImage(image, 0, 0, size, size);

          layers.push({
            size,
            width: canvas.width,
            height: canvas.height,
            dataUrl: canvas.toDataURL('image/png')
          });
        }

        return { devicePixelRatio: window.devicePixelRatio, layers };
      })()`,
      true
    );

    if (rendered.devicePixelRatio !== 1) {
      throw new Error(
        `Windows icon renderer used device scale factor ${rendered.devicePixelRatio}.`
      );
    }

    await mkdir(outputDirectory, { recursive: true });
    for (const layer of rendered.layers) {
      if (layer.width !== layer.size || layer.height !== layer.size) {
        throw new Error(`Windows icon ${layer.size}px canvas has an incorrect backing size.`);
      }
      const prefix = 'data:image/png;base64,';
      if (!layer.dataUrl.startsWith(prefix)) {
        throw new Error(`Windows icon ${layer.size}px did not render as PNG.`);
      }

      const png = Buffer.from(layer.dataUrl.slice(prefix.length), 'base64');
      inspectRgbaPng(png, layer.size);
      await writeFile(path.join(outputDirectory, `${layer.size}.png`), png);
    }
  } finally {
    renderWindow.destroy();
    app.quit();
  }
};

main().catch((error) => {
  console.error(error);
  app.exit(1);
});
