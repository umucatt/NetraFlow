/// <reference types="node" />

import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test, { type TestContext } from 'node:test';
import { pathToFileURL } from 'node:url';

type BuildTarget = string | { target?: string; arch?: string[] };

type PackageJsonFixture = {
  version?: string;
  productName?: string;
  license?: string;
  main?: string;
  scripts?: Record<string, string>;
  build?: {
    icon?: string;
    files?: string[];
    win?: {
      target?: BuildTarget[];
      icon?: string;
      artifactName?: string;
      signAndEditExecutable?: boolean;
    };
    nsis?: {
      include?: string;
      differentialPackage?: boolean;
    };
  };
};

type PackageLockFixture = {
  version?: string;
  packages?: Record<string, { version?: string }>;
};

type GitInfoFixture = {
  available: boolean;
  message?: string;
  trackedPaths?: string[];
  ignoredPaths?: string[];
  dirtyLines?: string[];
  branchReadable?: boolean;
  commitReadable?: boolean;
};

type ReleaseCheckInputFixture = {
  rootDir: string;
  packageJson: PackageJsonFixture;
  packageLockJson: PackageLockFixture;
  changelogText: string | null;
  existingPaths: Set<string>;
  licensePaths: string[];
  scriptSources: {
    installer: string | null;
    portable: string | null;
  };
  env: Record<string, string>;
  gitInfo: GitInfoFixture;
};

type ReleaseCheckReport = {
  entries: Array<{ level: 'pass' | 'warn' | 'error'; message: string }>;
  errors: string[];
  warnings: string[];
};

type ReleaseCheckModule = {
  createReleaseMetadataFromTag: (
    releaseTag: string,
    productName?: string
  ) => {
    releaseTag: string;
    releaseVersion: string;
    isPrerelease: boolean;
    title: string;
    installerName: string;
    portableName: string;
  };
  evaluateReleaseCheck: (
    input: ReleaseCheckInputFixture,
    options?: { strict?: boolean }
  ) => ReleaseCheckReport;
  formatReleaseCheckReport: (report: ReleaseCheckReport) => string;
  isPrereleaseVersion: (version: string) => boolean;
  isValidReleaseVersion: (version: unknown) => boolean;
  isValidReleaseTag: (tag: unknown) => boolean;
  readReleaseCheckInput: (options: {
    rootDir: string;
    env?: Record<string, string>;
    gitInfo?: GitInfoFixture;
  }) => ReleaseCheckInputFixture;
};

const projectRootPath = process.cwd();
const logicModuleUrl = pathToFileURL(
  path.join(projectRootPath, 'scripts', 'release-check-logic.mjs')
).href;

const loadReleaseCheck = async () =>
  (await import(logicModuleUrl)) as ReleaseCheckModule;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const createPackageJson = (overrides: PackageJsonFixture = {}): PackageJsonFixture => {
  const base: PackageJsonFixture = {
    version: '0.9.6',
    productName: 'NetraFlow',
    license: 'GPL-3.0-only',
    main: 'dist-electron/main.js',
    scripts: {
      'dist:installer': 'node scripts/package-installer.mjs',
      'dist:portable': 'node scripts/package-portable.mjs'
    },
    build: {
      files: [
        'dist/**/*',
        'dist-electron/**/*',
        'public/**/*',
        'package.json',
        '!**/userdata/**',
        '!**/runtime/**',
        '!release/**',
        '!**/AppData/**'
      ],
      win: {
        target: [{ target: 'nsis', arch: ['x64'] }],
        icon: 'public/icons/netraflow.ico',
        artifactName: 'NetraFlow_${version}_Setup.${ext}',
        signAndEditExecutable: false
      },
      nsis: {
        include: 'build/installer/installer.nsh',
        differentialPackage: false
      }
    }
  };
  const next = clone(base);

  next.scripts = { ...next.scripts, ...overrides.scripts };
  next.build = {
    ...next.build,
    ...overrides.build,
    win: { ...next.build?.win, ...overrides.build?.win },
    nsis: { ...next.build?.nsis, ...overrides.build?.nsis }
  };

  return { ...next, ...overrides, scripts: next.scripts, build: next.build };
};

const createPackageLock = (overrides: PackageLockFixture = {}): PackageLockFixture => ({
  version: '0.9.6',
  packages: {
    '': {
      version: '0.9.6'
    },
    ...overrides.packages
  },
  ...overrides
});

const defaultExistingPaths = () =>
  new Set([
    'scripts/package-installer.mjs',
    'scripts/package-portable.mjs',
    'electron/main.ts',
    'electron/preload.ts',
    'public/icons/netraflow.ico',
    'build/installer/installer.nsh',
    'LICENSE'
  ]);

const defaultScriptSources = () => ({
  installer: 'const expectedArtifact = `${productName}_${version}_Setup.exe`;',
  portable:
    'const bundleName = `${productName}_${version}`;\nzipPath = path.join(outputRoot, `${bundleName}_Portable.zip`);'
});

const defaultGitInfo = (): GitInfoFixture => ({
  available: true,
  trackedPaths: [],
  ignoredPaths: [
    'runtime',
    'userdata',
    '.tmp-tests',
    '.tmp-dev-userdata',
    '.tmp-dev-runtime'
  ],
  dirtyLines: [],
  branchReadable: true,
  commitReadable: true
});

const createInput = (
  overrides: Partial<ReleaseCheckInputFixture> = {}
): ReleaseCheckInputFixture => ({
  rootDir: 'fixture',
  packageJson: overrides.packageJson ?? createPackageJson(),
  packageLockJson: overrides.packageLockJson ?? createPackageLock(),
  changelogText: Object.prototype.hasOwnProperty.call(overrides, 'changelogText')
    ? overrides.changelogText ?? null
    : '# CHANGELOG\n\n## 0.9.6\n\n* Ready\n',
  existingPaths: overrides.existingPaths ?? defaultExistingPaths(),
  licensePaths: overrides.licensePaths ?? ['LICENSE', 'COPYING'],
  scriptSources: overrides.scriptSources ?? defaultScriptSources(),
  env: overrides.env ?? {},
  gitInfo: overrides.gitInfo ?? defaultGitInfo()
});

const assertPasses = (report: ReleaseCheckReport) => {
  assert.deepEqual(report.errors, []);
};

const assertHasError = (report: ReleaseCheckReport, text: string) => {
  assert.equal(
    report.errors.some((message) => message.includes(text)),
    true,
    `Expected error containing: ${text}\nActual errors:\n${report.errors.join('\n')}`
  );
};

const assertHasWarning = (report: ReleaseCheckReport, text: string) => {
  assert.equal(
    report.warnings.some((message) => message.includes(text)),
    true,
    `Expected warning containing: ${text}\nActual warnings:\n${report.warnings.join('\n')}`
  );
};

test('release check accepts matching package and lock versions', async () => {
  const { evaluateReleaseCheck } = await loadReleaseCheck();
  const report = evaluateReleaseCheck(createInput());

  assertPasses(report);
});

test('release check passes before dist-electron exists in a clean checkout', async () => {
  const { evaluateReleaseCheck } = await loadReleaseCheck();
  const existingPaths = defaultExistingPaths();

  existingPaths.delete('dist-electron/main.js');
  existingPaths.delete('dist-electron/preload.js');

  const report = evaluateReleaseCheck(createInput({ existingPaths }));

  assertPasses(report);
});

test('release check reports missing or wrong package main entry', async () => {
  const { evaluateReleaseCheck } = await loadReleaseCheck();

  const missingReport = evaluateReleaseCheck(
    createInput({
      packageJson: createPackageJson({ main: undefined })
    })
  );

  assertHasError(missingReport, 'package.json.main is missing');

  const emptyReport = evaluateReleaseCheck(
    createInput({
      packageJson: createPackageJson({ main: '' })
    })
  );

  assertHasError(emptyReport, 'package.json.main is <empty>, expected dist-electron/main.js');

  const wrongReport = evaluateReleaseCheck(
    createInput({
      packageJson: createPackageJson({ main: './dist-electron/main.js' })
    })
  );

  assertHasError(
    wrongReport,
    'package.json.main is ./dist-electron/main.js, expected dist-electron/main.js'
  );

  const distPreloadReport = evaluateReleaseCheck(
    createInput({
      packageJson: createPackageJson({ main: 'dist-electron/preload.js' })
    })
  );

  assertHasError(
    distPreloadReport,
    'package.json.main is dist-electron/preload.js, expected dist-electron/main.js'
  );
});

test('release check reports package-lock top-level version mismatch', async () => {
  const { evaluateReleaseCheck } = await loadReleaseCheck();
  const report = evaluateReleaseCheck(
    createInput({
      packageLockJson: createPackageLock({ version: '0.9.5' })
    })
  );

  assertHasError(report, 'package-lock root version is 0.9.5');
});

test('release check reports package-lock root package version mismatch', async () => {
  const { evaluateReleaseCheck } = await loadReleaseCheck();
  const report = evaluateReleaseCheck(
    createInput({
      packageLockJson: createPackageLock({ packages: { '': { version: '0.9.5' } } })
    })
  );

  assertHasError(report, 'packages[""].version is 0.9.5');
});

test('release check validates safe full release versions without accepting v-prefixes or unsafe characters', async () => {
  const { isValidReleaseVersion, isValidReleaseTag } = await loadReleaseCheck();

  for (const version of [
    '0.9.7',
    '0.9.8-beta.1',
    '0.9.8_beta2',
    '0.9.8-BETA-test',
    '0.9.8-rc1',
    '0.9.8_RC-preview',
    '0.9.8-custom-rc-build'
  ]) {
    assert.equal(isValidReleaseVersion(version), true, version);
    assert.equal(isValidReleaseTag(`v${version}`), true, version);
  }

  for (const version of [
    'v0.9.7',
    '0.9',
    '',
    '1.0.0/evil',
    '1.0.0\\evil',
    '1.0.0:evil',
    '1.0.0*',
    '1.0.0?',
    '1.0.0"',
    "1.0.0'",
    '1.0.0;cmd',
    '1.0.0|cmd',
    '1.0.0`cmd',
    '1.0.0$cmd',
    '1.0.0&cmd',
    '1.0.0<cmd',
    '1.0.0>cmd',
    '1.0.0 rc1',
    '1.0.0\nrc1',
    '1.0.0\n',
    '1.0.0\r\n',
    '1.0.0\u0001rc1',
    '1.0.0+build'
  ]) {
    assert.equal(isValidReleaseVersion(version), false, version);
    assert.equal(isValidReleaseTag(`v${version}`), false, version);
  }

  assert.equal(isValidReleaseTag('0.9.7'), false);
});

test('release check derives prerelease status from numeric base version and suffix only', async () => {
  const { isPrereleaseVersion } = await loadReleaseCheck();
  const prereleaseCases = [
    '0.9.7',
    '0.10.0',
    '0.99.0-preview',
    '1.0.0-beta',
    '1.0.0-rc1',
    '2.0.0-RC-preview',
    '0.9.8-beta.1',
    '0.9.8_beta2',
    '0.9.8-BETA-test',
    '0.9.8-rc1',
    '0.9.8_RC-preview',
    '0.9.8-custom-rc-build'
  ];
  const stableCases = [
    '1.0.0',
    '1.0.1',
    '1.0.0-preview',
    '1.1.0-alpha',
    '2.0.0'
  ];

  for (const version of prereleaseCases) {
    assert.equal(isPrereleaseVersion(version), true, version);
  }

  for (const version of stableCases) {
    assert.equal(isPrereleaseVersion(version), false, version);
  }
});

test('release metadata keeps suffixes intact in titles assets and full release versions', async () => {
  const { createReleaseMetadataFromTag } = await loadReleaseCheck();

  assert.deepEqual(createReleaseMetadataFromTag('v0.9.8'), {
    releaseTag: 'v0.9.8',
    releaseVersion: '0.9.8',
    isPrerelease: true,
    title: 'NetraFlow 0.9.8',
    installerName: 'NetraFlow_0.9.8_Setup.exe',
    portableName: 'NetraFlow_0.9.8_Portable.zip'
  });
  assert.deepEqual(createReleaseMetadataFromTag('v1.0.0-rc1'), {
    releaseTag: 'v1.0.0-rc1',
    releaseVersion: '1.0.0-rc1',
    isPrerelease: true,
    title: 'NetraFlow 1.0.0-rc1',
    installerName: 'NetraFlow_1.0.0-rc1_Setup.exe',
    portableName: 'NetraFlow_1.0.0-rc1_Portable.zip'
  });
  assert.equal(createReleaseMetadataFromTag('v1.0.0').isPrerelease, false);
});

test('release check finds the exact CHANGELOG version heading', async () => {
  const { evaluateReleaseCheck } = await loadReleaseCheck();
  const report = evaluateReleaseCheck(
    createInput({
      changelogText: '# CHANGELOG\n\n## 0.9.6\n\nBody mentions 0.9.7 only here.\n'
    })
  );

  assertPasses(report);
});

test('release check matches suffixed CHANGELOG versions exactly without falling back to the base version', async () => {
  const { evaluateReleaseCheck } = await loadReleaseCheck();
  const version = '0.9.8-rc1';
  const packageJson = createPackageJson({ version });
  const packageLockJson = createPackageLock({
    version,
    packages: {
      '': {
        version
      }
    }
  });

  assertPasses(
    evaluateReleaseCheck(
      createInput({
        packageJson,
        packageLockJson,
        changelogText: '# CHANGELOG\n\n## 0.9.8-rc1\n\n* Ready\n',
        env: { NETRAFLOW_RELEASE_TAG: 'v0.9.8-rc1' }
      })
    )
  );

  const baseOnlyReport = evaluateReleaseCheck(
    createInput({
      packageJson,
      packageLockJson,
      changelogText: '# CHANGELOG\n\n## 0.9.8\n\n* Base only\n',
      env: { NETRAFLOW_RELEASE_TAG: 'v0.9.8-rc1' }
    })
  );

  assertHasError(baseOnlyReport, 'CHANGELOG has no version heading for 0.9.8-rc1');
});

test('release check does not treat CHANGELOG body mentions as a version heading', async () => {
  const { evaluateReleaseCheck } = await loadReleaseCheck();
  const report = evaluateReleaseCheck(
    createInput({
      changelogText: '# CHANGELOG\n\n## 0.9.5\n\nPreparing 0.9.6 notes.\n'
    })
  );

  assertHasError(report, 'CHANGELOG has no version heading for 0.9.6');
});

test('release check reports missing CHANGELOG', async () => {
  const { evaluateReleaseCheck } = await loadReleaseCheck();
  const report = evaluateReleaseCheck(createInput({ changelogText: null }));

  assertHasError(report, 'CHANGELOG.md is missing');
});

test('release check validates optional release tag sources', async () => {
  const { evaluateReleaseCheck } = await loadReleaseCheck();

  assertPasses(evaluateReleaseCheck(createInput()));
  assertPasses(
    evaluateReleaseCheck(createInput({ env: { NETRAFLOW_RELEASE_TAG: 'v0.9.6' } }))
  );

  const githubTagReport = evaluateReleaseCheck(
    createInput({ env: { GITHUB_REF_TYPE: 'tag', GITHUB_REF_NAME: 'v0.9.6' } })
  );

  assertPasses(githubTagReport);

  const mismatchReport = evaluateReleaseCheck(
    createInput({ env: { NETRAFLOW_RELEASE_TAG: 'v0.9.5' } })
  );

  assertHasError(mismatchReport, 'expected v0.9.6');
});

test('release check reports all missing required files together', async () => {
  const { evaluateReleaseCheck } = await loadReleaseCheck();
  const existingPaths = defaultExistingPaths();

  existingPaths.delete('scripts/package-portable.mjs');
  existingPaths.delete('public/icons/netraflow.ico');
  existingPaths.delete('build/installer/installer.nsh');

  const report = evaluateReleaseCheck(createInput({ existingPaths }));

  assertHasError(report, 'portable script is missing');
  assertHasError(report, 'application icon is missing');
  assertHasError(report, 'NSIS include is missing');
});

test('release check validates installer and portable naming rules', async () => {
  const { evaluateReleaseCheck } = await loadReleaseCheck();

  assertPasses(evaluateReleaseCheck(createInput()));

  const report = evaluateReleaseCheck(
    createInput({
      packageJson: createPackageJson({
        build: {
          win: {
            artifactName: 'NetraFlow_${version}_Installer.${ext}'
          }
        }
      })
    })
  );

  assertHasError(report, 'installer artifact naming');

  const differentialReport = evaluateReleaseCheck(
    createInput({
      packageJson: createPackageJson({
        build: {
          nsis: {
            differentialPackage: true
          }
        }
      })
    })
  );

  assertHasError(differentialReport, 'NSIS differential package must be disabled');
});

test('release check validates Git ignores and tracked user data', async () => {
  const { evaluateReleaseCheck } = await loadReleaseCheck();

  assertPasses(evaluateReleaseCheck(createInput()));

  const missingIgnoreReport = evaluateReleaseCheck(
    createInput({
      gitInfo: {
        ...defaultGitInfo(),
        ignoredPaths: ['runtime', '.tmp-tests', '.tmp-dev-userdata', '.tmp-dev-runtime']
      }
    })
  );

  assertHasError(missingIgnoreReport, 'Git ignore rules do not cover: userdata');

  const trackedReport = evaluateReleaseCheck(
    createInput({
      gitInfo: {
        ...defaultGitInfo(),
        trackedPaths: ['userdata/storage.json']
      }
    })
  );

  assertHasError(trackedReport, 'Git tracks user/runtime data paths');
});

test('release check validates electron-builder user data exclusions by coverage', async () => {
  const { evaluateReleaseCheck } = await loadReleaseCheck();

  assertPasses(evaluateReleaseCheck(createInput()));

  const report = evaluateReleaseCheck(
    createInput({
      packageJson: createPackageJson({
        build: {
          files: ['**/*', '!**/userdata/**']
        }
      })
    })
  );

  assertHasError(report, 'electron-builder files do not exclude');
});

test('release check treats dirty worktrees as warning normally and error in strict mode', async () => {
  const { evaluateReleaseCheck } = await loadReleaseCheck();
  const input = createInput({
    gitInfo: {
      ...defaultGitInfo(),
      dirtyLines: [' M package.json']
    }
  });
  const normalReport = evaluateReleaseCheck(input);

  assertPasses(normalReport);
  assertHasWarning(normalReport, 'Git worktree is dirty');

  const strictReport = evaluateReleaseCheck(input, { strict: true });

  assertHasError(strictReport, 'Git worktree is dirty');
});

test('release check output summarizes multiple independent failures', async () => {
  const { evaluateReleaseCheck, formatReleaseCheckReport } = await loadReleaseCheck();
  const report = evaluateReleaseCheck(
    createInput({
      packageJson: createPackageJson({ version: 'v0.9.6' }),
      packageLockJson: createPackageLock({ version: '0.9.5' }),
      changelogText: '# CHANGELOG\n\n## 0.9.5\n'
    })
  );
  const output = formatReleaseCheckReport(report);

  assert.ok(report.errors.length >= 3);
  assert.match(output, /\[error\] package version is not a valid release version/);
  assert.match(output, /\[error\] package-lock root version is 0\.9\.5/);
  assert.match(output, /Release check failed with \d+ error\(s\)\./);
});

const writeFixtureFile = (rootDir: string, relativePath: string, content: string) => {
  const filePath = path.join(rootDir, relativePath);

  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');
};

const collectFixtureFiles = (rootDir: string, currentDir = rootDir): string[] =>
  readdirSync(currentDir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      return collectFixtureFiles(rootDir, entryPath);
    }

    return [path.relative(rootDir, entryPath).split(path.sep).join('/')];
  });

const snapshotFixture = (rootDir: string) =>
  Object.fromEntries(
    collectFixtureFiles(rootDir).map((relativePath) => [
      relativePath,
      readFileSync(path.join(rootDir, relativePath), 'utf8')
    ])
  );

test('release check reads a fixture project without modifying files', async (t: TestContext) => {
  const { evaluateReleaseCheck, readReleaseCheckInput } = await loadReleaseCheck();
  const rootDir = mkdtempSync(path.join(tmpdir(), 'netraflow-release-check-'));

  t.after(() => {
    rmSync(rootDir, { recursive: true, force: true });
  });

  writeFixtureFile(rootDir, 'package.json', `${JSON.stringify(createPackageJson(), null, 2)}\n`);
  writeFixtureFile(rootDir, 'package-lock.json', `${JSON.stringify(createPackageLock(), null, 2)}\n`);
  writeFixtureFile(rootDir, 'CHANGELOG.md', '# CHANGELOG\n\n## 0.9.6\n\n* Ready\n');
  writeFixtureFile(rootDir, 'scripts/package-installer.mjs', defaultScriptSources().installer);
  writeFixtureFile(rootDir, 'scripts/package-portable.mjs', defaultScriptSources().portable);
  writeFixtureFile(rootDir, 'electron/main.ts', 'export {};\n');
  writeFixtureFile(rootDir, 'electron/preload.ts', 'export {};\n');
  writeFixtureFile(rootDir, 'public/icons/netraflow.ico', 'icon\n');
  writeFixtureFile(rootDir, 'build/installer/installer.nsh', '# nsis\n');
  writeFixtureFile(rootDir, 'LICENSE', 'GPL-3.0-only\n');

  const before = snapshotFixture(rootDir);
  const input = readReleaseCheckInput({
    rootDir,
    env: {},
    gitInfo: defaultGitInfo()
  });
  const report = evaluateReleaseCheck(input);
  const after = snapshotFixture(rootDir);

  assertPasses(report);
  assert.deepEqual(after, before);
});
