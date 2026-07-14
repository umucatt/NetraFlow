import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBundleReleaseNotesText, extractChangelogVersionSection } from './release-notes-logic.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const options = {};
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (!key?.startsWith('--') || value === undefined) throw new Error(`Invalid argument: ${key ?? '<missing>'}`);
  options[key.slice(2)] = value;
}
const manifestPath = path.resolve(rootDir, options.manifest ?? 'release-internal/bundle-manifest.json');
const outputPath = path.resolve(rootDir, options.output ?? 'release-internal/release-notes.md');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const changelogText = readFileSync(path.join(rootDir, 'CHANGELOG.md'), 'utf8');
const changelogSection = extractChangelogVersionSection({ changelogText, version: manifest.version }).body;
const notes = createBundleReleaseNotesText({ manifest, changelogSection });
writeFileSync(outputPath, notes, 'utf8');
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `release_notes_path=${path.relative(rootDir, outputPath).replaceAll(path.sep, '/')}\n`, 'utf8');
}
console.log(`Release notes written to ${outputPath}`);
