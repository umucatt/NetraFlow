import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const rootDir = process.cwd();
const readSource = (relativePath: string) =>
  readFileSync(path.join(rootDir, relativePath), 'utf8');

test('default, keyboard, pointer, and click selection share one active result class', () => {
  const itemSource = readSource('src/components/search/SearchResultItem.tsx');
  const listSource = readSource('src/components/search/SearchResultList.tsx');

  assert.match(itemSource, /active \? ' search-result-button--active' : ''/);
  assert.match(listSource, /const activeItemId = hoveredItemId \|\| selectedItemId/);
  assert.doesNotMatch(itemSource, /search-result-button--focused/);
  assert.doesNotMatch(itemSource, /search-result-button--hovered/);
});

test('active result geometry is clipped to the button and uses only an inset highlight', () => {
  const styles = readSource('src/styles.css');
  const buttonBlock = styles.match(/\.search-result-button \{[\s\S]*?\n\}/)?.[0] ?? '';
  const activeBlock = styles.match(
    /\.search-result-button:hover,[\s\S]*?\.search-result-button:focus-visible \{[\s\S]*?\n\}/
  )?.[0] ?? '';

  assert.match(buttonBlock, /overflow:\s*hidden/);
  assert.match(buttonBlock, /background-clip:\s*padding-box/);
  assert.match(activeBlock, /\.search-result-button--active/);
  assert.match(activeBlock, /box-shadow:\s*inset 0 0 0 1px/);
  assert.doesNotMatch(activeBlock, /margin:\s*-/);
  assert.doesNotMatch(activeBlock, /::before|::after|drop-shadow/);
  assert.deepEqual(activeBlock.match(/box-shadow:[^;]+/g), [
    'box-shadow: inset 0 0 0 1px var(--accent-border)'
  ]);
});

test('search business selection does not depend on window focus or document.activeElement', () => {
  const controllerSource = readSource('src/search/useGlobalSearchController.ts');
  const panelSource = readSource('src/components/search/GlobalSearchPanel.tsx');

  assert.doesNotMatch(controllerSource, /window\.addEventListener\(['"](?:blur|focus)/);
  assert.doesNotMatch(panelSource, /document\.activeElement/);
  assert.match(controllerSource, /type: 'reconcile-selection'/);
  assert.match(controllerSource, /selectedResultIdsByCategory/);
});
