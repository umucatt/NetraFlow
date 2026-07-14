import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectPlatformReleaseArtifacts,
  verifyAndCollectReleaseBundle
} from './release-pipeline-logic.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const options = {};
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (!key?.startsWith('--') || value === undefined) throw new Error(`Invalid argument: ${key ?? '<missing>'}`);
  options[key.slice(2)] = value;
}

const required = (name) => {
  if (!options[name]) throw new Error(`Missing --${name}.`);
  return options[name];
};
const resolveFromRoot = (value) => path.resolve(rootDir, value);
const appendOutputs = (outputs) => {
  if (!process.env.GITHUB_OUTPUT) return;
  appendFileSync(process.env.GITHUB_OUTPUT, `${Object.entries(outputs).map(([key, value]) => `${key}=${value}`).join('\n')}\n`, 'utf8');
};

try {
  const common = {
    inputDir: resolveFromRoot(required('input')),
    outputDir: resolveFromRoot(required('output')),
    version: required('version'),
    tag: required('tag'),
    commit: required('commit'),
    ...(options['min-size'] ? { minSizeBytes: Number(options['min-size']) } : {})
  };
  if (required('mode') === 'bundle') {
    const result = verifyAndCollectReleaseBundle(common);
    const manifestOutput = resolveFromRoot(required('manifest-output'));
    mkdirSync(path.dirname(manifestOutput), { recursive: true });
    writeFileSync(manifestOutput, `${JSON.stringify(result.bundleManifest, null, 2)}\n`, 'utf8');
    appendOutputs({
      bundle_dir: normalizeOutputPath(common.outputDir),
      bundle_manifest_path: normalizeOutputPath(manifestOutput),
      asset_count: String(result.assets.length)
    });
    console.log(`Verified final release bundle with ${result.assets.length} assets.`);
  } else {
    const result = collectPlatformReleaseArtifacts({
      ...common,
      platform: options.mode,
      ...(options['macos-signing'] ? { macosSigning: options['macos-signing'] } : {})
    });
    appendOutputs({
      manifest_path: normalizeOutputPath(result.manifestPath),
      artifact_dir: normalizeOutputPath(common.outputDir),
      asset_count: String(result.assetPaths.length)
    });
    console.log(`Verified ${options.mode} release artifacts: ${result.manifest.assets.map(({ name }) => name).join(', ')}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

function normalizeOutputPath(filePath) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, '/');
}
