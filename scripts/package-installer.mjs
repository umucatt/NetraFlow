import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Arch, Platform, build } from 'electron-builder';
import { prepareVersionedReleaseDir } from './release-utils.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const productName = packageJson.productName ?? 'NetraFlow';
const version = packageJson.version ?? '0.0.0';

for (const requiredBuildOutput of [
  path.join(rootDir, 'dist', 'index.html'),
  path.join(rootDir, 'dist-electron', 'main.js')
]) {
  if (!existsSync(requiredBuildOutput)) {
    throw new Error(`Missing build output: ${requiredBuildOutput}. Run npm run build first.`);
  }
}

const { folderName, outputDir } = prepareVersionedReleaseDir('installer', version);

process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
process.env.ELECTRON_BUILDER_DISABLE_BUILD_CACHE = 'true';

await build({
  projectDir: rootDir,
  targets: Platform.WINDOWS.createTarget(['nsis'], Arch.x64),
  publish: 'never',
  config: {
    directories: {
      output: outputDir
    }
  }
});

rmSync(path.join(outputDir, 'win-unpacked'), { recursive: true, force: true });

for (const generatedMetadataFile of ['builder-debug.yml', 'latest.yml']) {
  rmSync(path.join(outputDir, generatedMetadataFile), { force: true });
}

const expectedArtifact = `${productName}_${version}_Setup.exe`;
const artifactPath = path.join(outputDir, expectedArtifact);

if (!existsSync(artifactPath)) {
  throw new Error(`Installer artifact was not created: ${artifactPath}`);
}

const unexpectedInstallerArtifacts = readdirSync(outputDir, { withFileTypes: true })
  .filter((entry) => entry.name !== expectedArtifact)
  .map((entry) => entry.name);

if (unexpectedInstallerArtifacts.length > 0) {
  throw new Error(
    `Installer output contains unexpected entries:\n${unexpectedInstallerArtifacts.join('\n')}`
  );
}

console.log(`Installer release folder ${folderName}`);
console.log(`Created ${outputDir}`);
