import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Arch, Platform, build } from 'electron-builder';
import { assertPackagedRendererLoader } from './packaged-renderer-loader-logic.mjs';
import { prepareVersionedReleaseDir } from './release-utils.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const productName = packageJson.productName ?? 'NetraFlow';
const version = packageJson.version ?? '0.0.0';
const builtMainPath = path.join(rootDir, 'dist-electron', 'main.js');
const expectedElectronBuilderVersion = '26.8.1';
const expectedAppBuilderLibVersion = '26.8.1';
const electronBuilderMultiUserTemplatePath = path.join(
  rootDir,
  'node_modules',
  'app-builder-lib',
  'templates',
  'nsis',
  'multiUser.nsh'
);
const diagnosticsEnabled = String(process.env.NETRAFLOW_INSTALLER_DIAGNOSTICS ?? '').toLowerCase();
const isDiagnosticsRun = diagnosticsEnabled === '1' || diagnosticsEnabled === 'true';

const readInstalledPackageVersion = (packageName) => {
  const packagePath = path.join(rootDir, 'node_modules', packageName, 'package.json');
  const installedPackage = JSON.parse(readFileSync(packagePath, 'utf8'));

  return installedPackage.version;
};

const assertElectronBuilderPatchDependencyVersions = () => {
  const electronBuilderVersion = readInstalledPackageVersion('electron-builder');
  const appBuilderLibVersion = readInstalledPackageVersion('app-builder-lib');

  if (
    electronBuilderVersion !== expectedElectronBuilderVersion ||
    appBuilderLibVersion !== expectedAppBuilderLibVersion
  ) {
    throw new Error(
      [
        'Refusing to patch electron-builder NSIS template for an unverified dependency version.',
        `Expected electron-builder ${expectedElectronBuilderVersion}, found ${electronBuilderVersion}.`,
        `Expected app-builder-lib ${expectedAppBuilderLibVersion}, found ${appBuilderLibVersion}.`
      ].join('\n')
    );
  }
};

const patchElectronBuilderPerUserInstallModeTemplate = () => {
  assertElectronBuilderPatchDependencyVersions();

  const source = readFileSync(electronBuilderMultiUserTemplatePath, 'utf8');
  const unsafeKnownFolderLines = [
    '      System::Store S',
    '      # Win7 has a per-user programfiles known folder and this can be a non-default location',
    '      System::Call \'SHELL32::SHGetKnownFolderPath(g "${FOLDERID_UserProgramFiles}", i ${KF_FLAG_CREATE}, p 0, *p .r2)i.r1\'',
    '      ${If} $1 == 0',
    '        System::Call \'*$2(&w${NSIS_MAX_STRLEN} .s)\'',
    '        StrCpy $0 $1',
    '        System::Call \'OLE32::CoTaskMemFree(p r2)\'',
    '      ${endif}',
    '      System::Store L'
  ];
  const unsafeKnownFolderBlockLf = unsafeKnownFolderLines.join('\n');
  const unsafeKnownFolderBlockCrlf = unsafeKnownFolderLines.join('\r\n');
  const safeKnownFolderLines = [
    '      # NetraFlow keeps per-user installs under LocalAppData\\Programs.',
    '      # Avoid SHGetKnownFolderPath here: in silent default current-user mode,',
    '      # NSIS System.dll can crash before the later /D= override is applied.'
  ];
  const safeKnownFolderBlockLf = safeKnownFolderLines.join('\n');
  const safeKnownFolderBlockCrlf = safeKnownFolderLines.join('\r\n');

  if (source.includes(safeKnownFolderBlockLf) || source.includes(safeKnownFolderBlockCrlf)) {
    return;
  }

  if (source.includes(unsafeKnownFolderBlockCrlf)) {
    writeFileSync(
      electronBuilderMultiUserTemplatePath,
      source.replace(unsafeKnownFolderBlockCrlf, safeKnownFolderBlockCrlf)
    );
    return;
  }

  if (!source.includes(unsafeKnownFolderBlockLf)) {
    throw new Error('Unable to patch electron-builder multiUser.nsh: expected per-user known-folder block was not found.');
  }

  writeFileSync(
    electronBuilderMultiUserTemplatePath,
    source.replace(unsafeKnownFolderBlockLf, safeKnownFolderBlockLf)
  );
};

const prepareVersionedDiagnosticsDir = () => {
  const diagnosticsRoot = path.join(rootDir, 'release-diagnostics', 'installer');
  const baseFolderName = version;

  mkdirSync(diagnosticsRoot, { recursive: true });

  for (let suffix = 0; ; suffix += 1) {
    const folderName = suffix === 0 ? baseFolderName : `${baseFolderName}_${suffix}`;
    const outputDir = path.join(diagnosticsRoot, folderName);

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir);

      return { folderName, outputDir };
    }
  }
};

for (const requiredBuildOutput of [
  path.join(rootDir, 'dist', 'index.html'),
  builtMainPath
]) {
  if (!existsSync(requiredBuildOutput)) {
    throw new Error(`Missing build output: ${requiredBuildOutput}. Run npm run build first.`);
  }
}

assertPackagedRendererLoader(builtMainPath);
patchElectronBuilderPerUserInstallModeTemplate();

const { folderName, outputDir } = isDiagnosticsRun
  ? prepareVersionedDiagnosticsDir()
  : prepareVersionedReleaseDir('installer', version);

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

const unpackedResourcesDir = path.join(outputDir, 'win-unpacked', 'resources');
const unpackedAppAsarPath = path.join(unpackedResourcesDir, 'app.asar');
const unpackedAppDir = path.join(unpackedResourcesDir, 'app');
const unpackedNodeModulesDir = path.join(unpackedResourcesDir, 'app.asar.unpacked', 'node_modules');

if (!existsSync(unpackedAppAsarPath)) {
  throw new Error(`Installer app source is missing app.asar: ${unpackedAppAsarPath}`);
}

if (existsSync(unpackedAppDir)) {
  throw new Error(`Installer app source must not contain unpacked resources/app: ${unpackedAppDir}`);
}

if (existsSync(unpackedNodeModulesDir)) {
  throw new Error(
    `Installer app source must not unpack the full node_modules tree: ${unpackedNodeModulesDir}`
  );
}

const expectedArtifact = `${productName}_${version}_Setup.exe`;
const artifactPath = path.join(outputDir, expectedArtifact);

if (!existsSync(artifactPath)) {
  throw new Error(`Installer artifact was not created: ${artifactPath}`);
}

if (!isDiagnosticsRun) {
  rmSync(path.join(outputDir, 'win-unpacked'), { recursive: true, force: true });

  for (const generatedMetadataFile of ['builder-debug.yml', 'latest.yml', 'builder-effective-config.yaml']) {
    rmSync(path.join(outputDir, generatedMetadataFile), { force: true });
  }

  const unexpectedInstallerArtifacts = readdirSync(outputDir, { withFileTypes: true })
    .filter((entry) => entry.name !== expectedArtifact)
    .map((entry) => entry.name);

  if (unexpectedInstallerArtifacts.length > 0) {
    throw new Error(
      `Installer output contains unexpected entries:\n${unexpectedInstallerArtifacts.join('\n')}`
    );
  }
}

console.log(`${isDiagnosticsRun ? 'Installer diagnostics folder' : 'Installer release folder'} ${folderName}`);
console.log(`Created ${outputDir}`);
