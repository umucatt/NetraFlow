import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createReleaseNotesText } from './release-notes-logic.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const releaseNotesPath = path.join(rootDir, 'release-notes.md');
const releaseNotesRelativePath = 'release-notes.md';

const appendGitHubOutputs = (outputs) => {
  const outputPath = process.env.GITHUB_OUTPUT;

  if (!outputPath) {
    return;
  }

  appendFileSync(
    outputPath,
    `${Object.entries(outputs)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')}\n`,
    'utf8'
  );
};

try {
  const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const releaseVersion = process.env.RELEASE_VERSION || packageJson.version;

  if (process.env.RELEASE_VERSION && process.env.RELEASE_VERSION !== packageJson.version) {
    throw new Error(
      `RELEASE_VERSION is ${process.env.RELEASE_VERSION}, expected package.json version ${packageJson.version}`
    );
  }

  const changelogText = readFileSync(path.join(rootDir, 'CHANGELOG.md'), 'utf8');
  const releaseNotesText = createReleaseNotesText({
    changelogText,
    version: releaseVersion
  });
  const forbiddenComparisonLabel = ['Full', 'Changelog:'].join(' ');

  if (
    releaseNotesText.includes(forbiddenComparisonLabel) ||
    releaseNotesText.includes('compare/')
  ) {
    throw new Error('Release notes must not include changelog comparison links.');
  }

  writeFileSync(releaseNotesPath, releaseNotesText, 'utf8');
  appendGitHubOutputs({ release_notes_path: releaseNotesRelativePath });

  process.stdout.write(`Release notes written to ${releaseNotesRelativePath}\n`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
