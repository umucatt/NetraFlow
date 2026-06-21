import { appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createWorkflowOutputs,
  verifyReleaseArtifacts,
  writeSha256Sums
} from './release-artifact-logic.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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
  const artifactSummary = verifyReleaseArtifacts({
    rootDir,
    productName: packageJson.productName ?? 'NetraFlow',
    version: packageJson.version
  });
  const checksumSummary = writeSha256Sums({ rootDir, artifactSummary });
  const outputs = createWorkflowOutputs({ rootDir, artifactSummary, checksumSummary });

  appendGitHubOutputs(outputs);

  process.stdout.write('Release artifacts verified\n');
  process.stdout.write(`- installer: ${outputs.installer_path}\n`);
  process.stdout.write(`- portable: ${outputs.portable_path}\n`);
  process.stdout.write(`- checksums: ${outputs.checksum_path}\n`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
