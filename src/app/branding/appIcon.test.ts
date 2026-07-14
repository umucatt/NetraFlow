import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { getAppIconResource } from './appIcon.js';

const normalizeLineEndings = (value: string) => value.replace(/\r\n/g, '\n');

test('application icon resource is selected once from the preload platform value', () => {
  assert.equal(getAppIconResource('darwin'), 'icons/netraflow-macos.svg');
  assert.equal(getAppIconResource('win32'), 'icons/netraflow.svg');
  assert.equal(getAppIconResource('linux'), 'icons/netraflow.svg');
});

test('the public favicon uses the platform selector while in-app brand surfaces use SVG markup', () => {
  const mainSource = readFileSync('src/main.tsx', 'utf8');
  const logoSource = readFileSync('src/app/branding/NetraFlowLogo.tsx', 'utf8');

  assert.match(mainSource, /getAppIconResource\(window\.appInfo\?\.platform\)/);
  assert.equal(logoSource.includes('netraflow-logo.svg?raw'), true);
  assert.equal(logoSource.includes('<img'), false);
});

test('canonical brand SVG is parseable, mirrored for public assets, and keeps the established geometry', () => {
  const canonicalSvg = readFileSync('src/assets/brand/netraflow-logo.svg', 'utf8');
  const publicSvg = readFileSync('public/icons/netraflow.svg', 'utf8');

  assert.match(canonicalSvg, /^<svg\b[^>]*viewBox="0 0 1024 1024"/);
  assert.equal(canonicalSvg.includes('<rect'), true);
  assert.equal(canonicalSvg.includes('<path'), true);
  assert.equal(canonicalSvg.includes('<circle'), true);
  assert.equal(canonicalSvg.includes('shape-rendering="crispEdges"'), false);
  assert.equal(canonicalSvg.includes('image-rendering="pixelated"'), false);
  assert.equal(normalizeLineEndings(publicSvg), normalizeLineEndings(canonicalSvg));
});

test('all existing in-app brand logo surfaces use the canonical NetraFlowLogo component', () => {
  const surfacePaths = [
    'src/app/windowFrame/WindowTitleBar.tsx',
    'src/features/overview/AssetOverviewPage.tsx',
    'src/features/settings/AboutNetraFlowPanel.tsx',
    'src/app/lockScreen/LockScreenLayer.tsx'
  ];

  for (const surfacePath of surfacePaths) {
    const source = readFileSync(surfacePath, 'utf8');
    assert.equal(source.includes('NetraFlowLogo'), true, surfacePath);
    assert.equal(source.includes('productIconPath'), false, surfacePath);
  }

  const rendererSource = surfacePaths
    .map((surfacePath) => readFileSync(surfacePath, 'utf8'))
    .join('\n');
  const foundationStyles = readFileSync('src/styles/foundation.css', 'utf8');

  assert.equal(rendererSource.includes('netraflow.ico'), false);
  assert.equal(rendererSource.includes('netraflow.png'), false);
  assert.match(foundationStyles, /\.netraflow-logo\s*\{[^}]*display: block;[^}]*aspect-ratio: 1;/s);
});
