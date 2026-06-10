/// <reference types="node" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  EASTER_CAT_FRAME_SIZE_PX,
  EASTER_CAT_INITIAL_REVEAL_OFFSET,
  clampEasterCatRevealOffset,
  getEasterCatMaxRevealOffset,
  resetEasterCatRevealOffset,
  resolveEasterCatRevealOffsetAfterResize,
  resolveEasterCatRevealOffsetAfterWheel
} from './easterCatRevealLogic';

const readProjectFile = (path: string) =>
  readFileSync(new URL(`../../../../${path}`, import.meta.url), 'utf8');

const revealBounds = {
  frameHeight: EASTER_CAT_FRAME_SIZE_PX,
  containerHeight: 720
};

const extractCssBlock = (source: string, selector: string) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`${escapedSelector}\\s*\\{[^}]*\\}`, 's'));

  assert.ok(match, `Missing CSS block for ${selector}`);

  return match[0];
};

test('easter cat enters the about page hidden and ignores restored page scroll memory', () => {
  const restoredScrollTop = 2400;
  const initialOffset = resetEasterCatRevealOffset();

  assert.equal(initialOffset, EASTER_CAT_INITIAL_REVEAL_OFFSET);
  assert.equal(restoredScrollTop > 0, true);
  assert.equal(
    resolveEasterCatRevealOffsetAfterResize({
      currentOffset: initialOffset,
      ...revealBounds
    }),
    EASTER_CAT_INITIAL_REVEAL_OFFSET
  );
});

test('wheeling content upward reveals the navigation easter cat', () => {
  const nextOffset = resolveEasterCatRevealOffsetAfterWheel({
    currentOffset: EASTER_CAT_INITIAL_REVEAL_OFFSET,
    deltaY: 60,
    ...revealBounds
  });

  assert.equal(nextOffset > EASTER_CAT_INITIAL_REVEAL_OFFSET, true);
  assert.equal(nextOffset < getEasterCatMaxRevealOffset(revealBounds), true);
});

test('navigation easter cat reveal is capped at the navigation bottom limit', () => {
  const maxOffset = getEasterCatMaxRevealOffset(revealBounds);

  assert.equal(maxOffset, EASTER_CAT_FRAME_SIZE_PX);
  assert.equal(
    resolveEasterCatRevealOffsetAfterWheel({
      currentOffset: EASTER_CAT_INITIAL_REVEAL_OFFSET,
      deltaY: 10000,
      ...revealBounds
    }),
    maxOffset
  );
  assert.equal(clampEasterCatRevealOffset(maxOffset + 80, maxOffset), maxOffset);
});

test('continued upward wheel input does not move the navigation easter cat past the cap', () => {
  const maxOffset = getEasterCatMaxRevealOffset(revealBounds);
  const firstOffset = resolveEasterCatRevealOffsetAfterWheel({
    currentOffset: maxOffset,
    deltaY: 120,
    ...revealBounds
  });
  const secondOffset = resolveEasterCatRevealOffsetAfterWheel({
    currentOffset: firstOffset,
    deltaY: 120,
    ...revealBounds
  });

  assert.equal(firstOffset, maxOffset);
  assert.equal(secondOffset, maxOffset);
});

test('wheeling content downward retracts the navigation easter cat without reverse overflow', () => {
  const maxOffset = getEasterCatMaxRevealOffset(revealBounds);
  const partialOffset = resolveEasterCatRevealOffsetAfterWheel({
    currentOffset: maxOffset,
    deltaY: -80,
    ...revealBounds
  });
  const hiddenOffset = resolveEasterCatRevealOffsetAfterWheel({
    currentOffset: partialOffset,
    deltaY: -10000,
    ...revealBounds
  });

  assert.equal(partialOffset < maxOffset, true);
  assert.equal(hiddenOffset, EASTER_CAT_INITIAL_REVEAL_OFFSET);
});

test('switching settings pages resets the navigation easter cat reveal lifecycle', () => {
  const revealedOffset = resolveEasterCatRevealOffsetAfterWheel({
    currentOffset: EASTER_CAT_INITIAL_REVEAL_OFFSET,
    deltaY: 120,
    ...revealBounds
  });
  const afterSwitchOffset = resetEasterCatRevealOffset();
  const afterReentryOffset = resetEasterCatRevealOffset();
  const afterFreshWheelOffset = resolveEasterCatRevealOffsetAfterWheel({
    currentOffset: afterReentryOffset,
    deltaY: 120,
    ...revealBounds
  });

  assert.equal(revealedOffset > EASTER_CAT_INITIAL_REVEAL_OFFSET, true);
  assert.equal(afterSwitchOffset, EASTER_CAT_INITIAL_REVEAL_OFFSET);
  assert.equal(afterReentryOffset, EASTER_CAT_INITIAL_REVEAL_OFFSET);
  assert.equal(afterFreshWheelOffset > EASTER_CAT_INITIAL_REVEAL_OFFSET, true);
});

test('resize keeps hidden cats hidden and clamps already revealed cats', () => {
  assert.equal(
    resolveEasterCatRevealOffsetAfterResize({
      currentOffset: EASTER_CAT_INITIAL_REVEAL_OFFSET,
      frameHeight: EASTER_CAT_FRAME_SIZE_PX,
      containerHeight: 320
    }),
    EASTER_CAT_INITIAL_REVEAL_OFFSET
  );
  assert.equal(
    resolveEasterCatRevealOffsetAfterResize({
      currentOffset: EASTER_CAT_FRAME_SIZE_PX,
      frameHeight: 68,
      containerHeight: 320
    }),
    68
  );
  assert.equal(
    resolveEasterCatRevealOffsetAfterResize({
      currentOffset: EASTER_CAT_FRAME_SIZE_PX,
      frameHeight: EASTER_CAT_FRAME_SIZE_PX,
      containerHeight: 0
    }),
    EASTER_CAT_INITIAL_REVEAL_OFFSET
  );
});

test('easter cat is attached to the global settings navigation instead of window or about content', () => {
  const appSource = readProjectFile('src/App.tsx');
  const settingsPageSource = readProjectFile('src/features/settings/SettingsPage.tsx');
  const aboutPanelSource = readProjectFile(
    'src/features/settings/AboutNetraFlowPanel.tsx'
  );
  const stylesSource = readProjectFile('src/styles.css');
  const panelBlock = extractCssBlock(stylesSource, '.settings-navigation-panel');
  const catBlock = extractCssBlock(stylesSource, '.settings-easter-cat');

  assert.equal(aboutPanelSource.includes('about-netraflow__cat'), false);
  assert.equal(aboutPanelSource.includes('CatIdleIcon'), false);
  assert.equal(settingsPageSource.includes('settings-navigation-panel'), true);
  assert.equal(settingsPageSource.includes('settings-easter-cat'), true);
  assert.equal(settingsPageSource.includes("selectedSection === 'about'"), true);
  assert.equal(settingsPageSource.includes('{isAboutSection ? ('), true);
  assert.match(panelBlock, /position: relative;/);
  assert.match(panelBlock, /overflow: hidden;/);
  assert.match(catBlock, /position: absolute;/);
  assert.match(catBlock, /bottom: 0;/);
  assert.match(catBlock, /transform: translateY\(/);
  assert.equal(catBlock.includes('position: fixed'), false);
  assert.equal(catBlock.includes('left: 50%'), false);
  assert.equal(catBlock.includes('translate('), false);
  assert.equal(
    appSource.includes("navigationSide: globalSettings.mainContentPosition === 'right' ? 'left' : 'right'"),
    true
  );
});

test('navigation easter cat mirrors between right and left navigation sides', () => {
  const settingsPageSource = readProjectFile('src/features/settings/SettingsPage.tsx');
  const stylesSource = readProjectFile('src/styles.css');
  const rightBlock = extractCssBlock(stylesSource, '.settings-easter-cat--nav-right');
  const leftBlock = extractCssBlock(stylesSource, '.settings-easter-cat--nav-left');

  assert.equal(settingsPageSource.includes('settings-navigation-panel--nav-${navigationSide}'), true);
  assert.equal(settingsPageSource.includes('settings-easter-cat--nav-${navigationSide}'), true);
  assert.match(rightBlock, /right: 0;/);
  assert.match(leftBlock, /left: 0;/);
  assert.equal(rightBlock.includes('left:'), false);
  assert.equal(leftBlock.includes('right:'), false);
});

test('navigation easter cat aligns to nav controls and keeps the translucent enlarged frame', () => {
  const stylesSource = readProjectFile('src/styles.css');
  const foundationSource = readProjectFile('src/styles/foundation.css');
  const navBlock = extractCssBlock(stylesSource, '.global-settings-nav');
  const actionBlock = extractCssBlock(stylesSource, '.right-panel-action');
  const catBlock = extractCssBlock(stylesSource, '.settings-easter-cat');
  const frameBlock = extractCssBlock(stylesSource, '.settings-easter-cat__frame');
  const imageBlock = extractCssBlock(stylesSource, '.settings-easter-cat__image');

  assert.equal(EASTER_CAT_FRAME_SIZE_PX > 104, true);
  assert.equal(EASTER_CAT_FRAME_SIZE_PX <= 130, true);
  assert.match(navBlock, /padding: 0;/);
  assert.match(actionBlock, /width: 100%;/);
  assert.match(catBlock, /--settings-easter-cat-frame-size: 122px;/);
  assert.match(frameBlock, /width: var\(--settings-easter-cat-frame-size, 122px\);/);
  assert.match(frameBlock, /height: var\(--settings-easter-cat-frame-size, 122px\);/);
  assert.match(frameBlock, /border-radius: 18px;/);
  assert.match(frameBlock, /background: var\(--cat-easter-bg\);/);
  assert.match(imageBlock, /width: 92px;/);
  assert.match(imageBlock, /height: 92px;/);
  assert.equal(foundationSource.includes('--cat-easter-bg: rgba('), true);
  assert.equal(foundationSource.includes('--cat-easter-border: rgba('), true);
});

test('navigation easter cat stays independent from page position memory and storage', () => {
  const logicSource = readProjectFile('src/features/settings/easterCatRevealLogic.ts');
  const settingsPageSource = readProjectFile('src/features/settings/SettingsPage.tsx');
  const navigationPanelSource = settingsPageSource.slice(
    settingsPageSource.indexOf('export function SettingsNavigationPanel'),
    settingsPageSource.indexOf('export default SettingsPage')
  );
  const combinedSource = `${logicSource}\n${navigationPanelSource}`;

  assert.equal(combinedSource.includes('readPageScrollTop'), false);
  assert.equal(combinedSource.includes('rememberPageScrollTop'), false);
  assert.equal(combinedSource.includes('pagePositionMemoryMode'), false);
  assert.equal(combinedSource.includes('scrollTop'), false);
  assert.equal(combinedSource.includes('localStorage'), false);
  assert.equal(combinedSource.includes('innerHeight'), false);
  assert.equal(settingsPageSource.includes("addEventListener('wheel'"), true);
  assert.equal(settingsPageSource.includes("removeEventListener('wheel'"), true);
  assert.equal(settingsPageSource.includes("addEventListener('resize'"), true);
});
