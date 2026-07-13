import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createStartupThemeSnapshot,
  normalizeThemeBootstrapSettings
} from './startupTheme';

test('startup theme snapshot preserves default style and resolved light or dark theme', () => {
  const light = createStartupThemeSnapshot(
    normalizeThemeBootstrapSettings({ themeMode: 'light', themeStyle: 'default' }),
    'dark'
  );
  const dark = createStartupThemeSnapshot(
    normalizeThemeBootstrapSettings({ themeMode: 'dark', themeStyle: 'default' }),
    'light'
  );

  assert.deepEqual(light, {
    resolvedTheme: 'light',
    themeStyle: 'default',
    backgroundColor: '#f6f3ea'
  });
  assert.deepEqual(dark, {
    resolvedTheme: 'dark',
    themeStyle: 'default',
    backgroundColor: '#171a1f'
  });
});

test('startup theme snapshot permits nyaa only when it is unlocked', () => {
  const unlocked = createStartupThemeSnapshot(
    normalizeThemeBootstrapSettings({
      themeMode: 'system',
      themeStyle: 'nyaa',
      nyaaThemeUnlocked: true
    }),
    'dark'
  );
  const locked = createStartupThemeSnapshot(
    normalizeThemeBootstrapSettings({
      themeMode: 'light',
      themeStyle: 'nyaa',
      nyaaThemeUnlocked: false
    }),
    'dark'
  );

  assert.deepEqual(unlocked, {
    resolvedTheme: 'dark',
    themeStyle: 'nyaa',
    backgroundColor: '#18141b'
  });
  assert.equal(locked.themeStyle, 'default');
  assert.equal(locked.resolvedTheme, 'light');
});

test('invalid startup theme values fall back without changing light or dark resolution', () => {
  const invalidStyle = normalizeThemeBootstrapSettings({
    themeMode: 'dark',
    themeStyle: 'unknown',
    nyaaThemeUnlocked: true
  });
  const invalidMode = normalizeThemeBootstrapSettings({
    themeMode: 'unknown',
    themeStyle: 'default'
  });

  assert.equal(invalidStyle.themeStyle, 'default');
  assert.equal(createStartupThemeSnapshot(invalidStyle, 'light').resolvedTheme, 'dark');
  assert.equal(createStartupThemeSnapshot(invalidMode, 'light').resolvedTheme, 'light');
});
