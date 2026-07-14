import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const EXPECTED_ICO_SIZES = [16, 20, 24, 32, 40, 48, 64, 128, 256];
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const PRIOR_WINDOWS_ICO_SHA256 =
  '36d4bd56127ac789e6194b8c84ba43e126a44262f5957f3a1e7f5989fe8658c1';
const EXPECTED_WINDOWS_ICO_SHA256 =
  '20fb90f614c92987146c5589f4fa8cd9475e6d128ab8cc13565df4cabba09f16';

test('Windows ICO contains independent 32-bit RGBA PNG layers at every required size', () => {
  const ico = readFileSync('public/icons/netraflow.ico');
  const count = ico.readUInt16LE(4);

  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(count, EXPECTED_ICO_SIZES.length);

  const entries = Array.from({ length: count }, (_, index) => {
    const directoryOffset = 6 + index * 16;
    const width = ico[directoryOffset] || 256;
    const height = ico[directoryOffset + 1] || 256;
    const byteLength = ico.readUInt32LE(directoryOffset + 8);
    const imageOffset = ico.readUInt32LE(directoryOffset + 12);
    const png = ico.subarray(imageOffset, imageOffset + byteLength);

    assert.equal(width, height);
    assert.equal(ico.readUInt16LE(directoryOffset + 4), 1);
    assert.equal(ico.readUInt16LE(directoryOffset + 6), 32);
    assert.equal(png.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE), true);
    assert.equal(png.readUInt32BE(16), width);
    assert.equal(png.readUInt32BE(20), height);
    assert.equal(png[24], 8);
    assert.equal(png[25], 6);

    return { width, byteLength, imageOffset };
  });

  assert.deepEqual(entries.map((entry) => entry.width), EXPECTED_ICO_SIZES);
  assert.equal(new Set(entries.map((entry) => entry.imageOffset)).size, entries.length);
  assert.equal(new Set(entries.map((entry) => entry.byteLength)).size, entries.length);
  const sha256 = createHash('sha256').update(ico).digest('hex');
  assert.equal(sha256, EXPECTED_WINDOWS_ICO_SHA256);
  assert.notEqual(sha256, PRIOR_WINDOWS_ICO_SHA256);
});

test('Windows icon generation directly rasterizes the canonical SVG at DPR 1 without network input', () => {
  const iconGenerator = readFileSync('scripts/generate-windows-icon.mjs', 'utf8');
  const iconRenderer = readFileSync('scripts/render-windows-icon.mjs', 'utf8');
  const iconWriter = readFileSync('scripts/windows-icon-format.mjs', 'utf8');
  const canonicalSvg = readFileSync('src/assets/brand/netraflow-logo.svg', 'utf8');
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
    scripts?: Record<string, string>;
  };

  assert.match(canonicalSvg, /^<svg\b[^>]*\bviewBox="0 0 1024 1024"/);
  assert.equal(iconGenerator.includes("'src', 'assets', 'brand', 'netraflow-logo.svg'"), true);
  assert.equal(
    iconGenerator.includes('const icoSizes = [16, 20, 24, 32, 40, 48, 64, 128, 256]'),
    true
  );
  assert.equal(iconGenerator.includes("import electronPath from 'electron'"), true);
  assert.equal(iconGenerator.includes('inspectIco(await readFile(outputIco), icoSizes)'), true);
  assert.equal(iconRenderer.includes("appendSwitch('force-device-scale-factor', '1')"), true);
  assert.match(iconRenderer, /show:\s*false/);
  assert.match(iconRenderer, /transparent:\s*true/);
  assert.equal(iconRenderer.includes('canvas.width = size'), true);
  assert.equal(iconRenderer.includes('canvas.height = size'), true);
  assert.equal(iconRenderer.includes('context.drawImage(image, 0, 0, size, size)'), true);
  assert.equal(iconWriter.includes('colorType !== 6'), true);
  assert.equal(iconWriter.includes('createIco'), true);
  assert.equal(packageJson.scripts?.['generate:windows-icon'], 'node scripts/generate-windows-icon.mjs');
  assert.doesNotMatch(`${iconGenerator}\n${iconRenderer}`, /fetch\s*\(|https?:\/\/|default_app|electron\.ico/i);
});

test('Windows window, executable, and UserTask icon paths stay on controlled application assets', () => {
  const mainSource = readFileSync('electron/mainApplication.ts', 'utf8');
  const windowOptions = readFileSync('electron/windowPlatformOptions.ts', 'utf8');
  const executablePatcher = readFileSync('scripts/patch-executable-resources.mjs', 'utf8');
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
    build?: {
      win?: { icon?: string };
      nsis?: { installerIcon?: string; uninstallerIcon?: string };
    };
  };

  assert.equal(packageJson.build?.win?.icon, 'public/icons/netraflow.ico');
  assert.equal(packageJson.build?.nsis?.installerIcon, 'public/icons/netraflow.ico');
  assert.equal(packageJson.build?.nsis?.uninstallerIcon, 'public/icons/netraflow.ico');
  assert.equal(windowOptions.includes("'public/icons/netraflow.ico'"), true);
  assert.equal(mainSource.includes("const APP_USER_MODEL_ID = 'com.netraflow.app'"), true);
  assert.equal(mainSource.includes("const DEV_APP_USER_MODEL_ID = 'com.netraflow.app.dev'"), true);
  assert.equal(
    mainSource.includes(
      'app.setAppUserModelId(app.isPackaged ? APP_USER_MODEL_ID : DEV_APP_USER_MODEL_ID)'
    ),
    true
  );
  assert.equal(mainSource.includes('const cleared = app.setUserTasks([])'), true);
  assert.equal(mainSource.includes('if (!cleared)'), true);
  assert.equal(mainSource.includes('const registered = app.setUserTasks(['), true);
  assert.equal(mainSource.includes('if (!registered)'), true);
  assert.match(
    mainSource,
    /iconPath: app\.isPackaged\s*\? process\.execPath\s*: getAppIconPath\(\{/
  );
  assert.equal(executablePatcher.includes("'--set-icon'"), true);
  assert.equal(executablePatcher.includes("'FileDescription'"), true);
  assert.equal(executablePatcher.includes("'ProductName'"), true);
  assert.equal(executablePatcher.includes("'OriginalFilename'"), true);
  assert.doesNotMatch(`${mainSource}\n${windowOptions}`, /default_app|electron\.ico/i);
});
