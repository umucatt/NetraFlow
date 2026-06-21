/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

type ReleaseNotesModule = {
  createReleaseNotesText: (options: { changelogText: string; version: string }) => string;
  extractChangelogVersionSection: (options: {
    changelogText: string;
    version: string;
  }) => {
    version: string;
    body: string;
  };
};

const projectRootPath = process.cwd();
const logicModuleUrl = pathToFileURL(
  path.join(projectRootPath, 'scripts', 'release-notes-logic.mjs')
).href;

const loadReleaseNotesLogic = async () =>
  (await import(logicModuleUrl)) as ReleaseNotesModule;

const assertRejectsWith = (callback: () => unknown, text: string) => {
  assert.throws(callback, (error) => {
    assert.equal(error instanceof Error, true);
    assert.match((error as Error).message, new RegExp(text));
    return true;
  });
};

test('release notes extract LF and CRLF changelog sections identically', async () => {
  const { createReleaseNotesText, extractChangelogVersionSection } =
    await loadReleaseNotesLogic();
  const changelogText = [
    '# CHANGELOG',
    '',
    '## 0.9.7',
    '',
    '### Added',
    '',
    '* Release workflow updates',
    '',
    '## 0.9.6',
    '',
    '* Previous release',
    ''
  ].join('\n');
  const expectedBody = ['### Added', '', '* Release workflow updates'].join('\n');

  const lfSection = extractChangelogVersionSection({ changelogText, version: '0.9.7' });
  const crlfSection = extractChangelogVersionSection({
    changelogText: changelogText.replace(/\n/g, '\r\n'),
    version: '0.9.7'
  });

  assert.equal(lfSection.body, expectedBody);
  assert.equal(crlfSection.body, expectedBody);
  assert.equal(createReleaseNotesText({ changelogText, version: '0.9.7' }), expectedBody);
  assert.equal(
    createReleaseNotesText({
      changelogText: changelogText.replace(/\n/g, '\r\n'),
      version: '0.9.7'
    }),
    expectedBody
  );
});

test('release notes precisely extract the target version section', async () => {
  const { extractChangelogVersionSection, createReleaseNotesText } =
    await loadReleaseNotesLogic();
  const changelogText = [
    '# CHANGELOG',
    '',
    '## 0.9.8',
    '',
    '* Mentions 0.9.7 in body text only.',
    '',
    '## 0.9.7',
    '',
    '### Fixed',
    '',
    '* Target version notes.',
    '',
    '### 0.9.6',
    '',
    '* Same text at a nested heading level stays in the body.',
    '',
    '## 0.9.6',
    '',
    '* Previous release',
    ''
  ].join('\n');
  const expectedBody = [
    '### Fixed',
    '',
    '* Target version notes.',
    '',
    '### 0.9.6',
    '',
    '* Same text at a nested heading level stays in the body.'
  ].join('\n');

  const section = extractChangelogVersionSection({ changelogText, version: '0.9.7' });

  assert.equal(section.body, expectedBody);
  const notesText = createReleaseNotesText({ changelogText, version: '0.9.7' });

  assert.equal(notesText, expectedBody);
  assert.equal(notesText.includes(['Full', 'Changelog:'].join(' ')), false);
  assert.equal(notesText.includes('compare/'), false);
});

test('release notes keep suffixed versions intact without comparison links', async () => {
  const { extractChangelogVersionSection, createReleaseNotesText } =
    await loadReleaseNotesLogic();
  const changelogText = [
    '# CHANGELOG',
    '',
    '## 0.9.8-rc1',
    '',
    '### Added',
    '',
    '* RC release notes.',
    '',
    '## 0.9.7-beta.2',
    '',
    '* Previous beta release.',
    '',
    '## 0.9.7',
    '',
    '* Stable release.',
    ''
  ].join('\n');
  const section = extractChangelogVersionSection({ changelogText, version: '0.9.8-rc1' });
  const notesText = createReleaseNotesText({ changelogText, version: '0.9.8-rc1' });

  assert.equal(section.version, '0.9.8-rc1');
  assert.equal(notesText, '### Added\n\n* RC release notes.');
  assert.equal(notesText.includes(['Full', 'Changelog:'].join(' ')), false);
  assert.equal(notesText.includes('compare/'), false);
});

test('release notes do not fall back from a suffixed version to the base version', async () => {
  const { extractChangelogVersionSection } = await loadReleaseNotesLogic();

  assertRejectsWith(
    () =>
      extractChangelogVersionSection({
        changelogText: '# CHANGELOG\n\n## 0.9.8\n\n* Base version notes.\n',
        version: '0.9.8-rc1'
      }),
    'CHANGELOG has no version heading for 0.9.8-rc1'
  );
});

test('release notes fail for missing empty or invalid target versions', async () => {
  const { extractChangelogVersionSection } = await loadReleaseNotesLogic();

  assertRejectsWith(
    () =>
      extractChangelogVersionSection({
        changelogText: '# CHANGELOG\n\n## 0.9.6\n\nPreparing 0.9.7 notes.\n',
        version: '0.9.7'
      }),
    'CHANGELOG has no version heading for 0.9.7'
  );
  assertRejectsWith(
    () =>
      extractChangelogVersionSection({
        changelogText: '# CHANGELOG\n\n## 0.9.7\n\n   \n\n## 0.9.6\n\n* Previous\n',
        version: '0.9.7'
      }),
    'CHANGELOG section for 0.9.7 is empty'
  );
  assertRejectsWith(
    () =>
      extractChangelogVersionSection({
        changelogText: '# CHANGELOG\n\n## 0.9.7\n\n* Ready\n\n## 0.9.6\n\n* Previous\n',
        version: 'v0.9.7'
      }),
    'RELEASE_VERSION is not a valid release version'
  );
  assertRejectsWith(
    () =>
      extractChangelogVersionSection({
        changelogText: '# CHANGELOG\n\n## 0.9.7\n\n* Ready\n\n## 0.9.6\n\n* Previous\n',
        version: '0.9.7/evil'
      }),
    'RELEASE_VERSION is not a valid release version'
  );
  assertRejectsWith(
    () =>
      extractChangelogVersionSection({
        changelogText: '# CHANGELOG\n\n## 0.9.7\n\n* Ready\n\n## 0.9.6\n\n* Previous\n',
        version: '0.9.7\n'
      }),
    'RELEASE_VERSION is not a valid release version'
  );
});

test('release notes generate stable release text without requiring a previous heading', async () => {
  const { createReleaseNotesText } = await loadReleaseNotesLogic();
  const changelogText = [
    '# CHANGELOG',
    '',
    '## 1.0.0',
    '',
    '### Changed',
    '',
    '* Stable release body.',
    ''
  ].join('\n');
  const notesText = createReleaseNotesText({ changelogText, version: '1.0.0' });

  assert.equal(notesText, '### Changed\n\n* Stable release body.');
  assert.equal(notesText.includes(['Full', 'Changelog:'].join(' ')), false);
  assert.equal(notesText.includes('compare/'), false);
});

test('release notes ignore lower-level headings that look like versions', async () => {
  const { extractChangelogVersionSection } = await loadReleaseNotesLogic();
  const changelogText = [
    '# CHANGELOG',
    '',
    '## 1.0.0',
    '',
    '* Current release',
    '',
    '### 0.9.9',
    '',
    '* Nested body heading.',
    '',
    '## 0.9.8_custom',
    '',
    '* Previous release',
    ''
  ].join('\n');
  const section = extractChangelogVersionSection({ changelogText, version: '1.0.0' });

  assert.equal(section.body.includes('### 0.9.9'), true);
  assert.equal(section.body.endsWith('* Nested body heading.'), true);
});
