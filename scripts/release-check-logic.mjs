import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const VERSION_PATTERN_SOURCE =
  '(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)' +
  '([-_][0-9A-Za-z](?:[0-9A-Za-z._-]*[0-9A-Za-z])?)?';
const VERSION_PATTERN = new RegExp(`^(?!.*[\\r\\n])${VERSION_PATTERN_SOURCE}$`);
const RELEASE_TAG_PATTERN = new RegExp(`^(?!.*[\\r\\n])v${VERSION_PATTERN_SOURCE}$`);
const CHANGELOG_VERSION_HEADING_PATTERN = new RegExp(
  `^##[ \\t]+(?:\\[(${VERSION_PATTERN_SOURCE})\\]|(${VERSION_PATTERN_SOURCE}))[ \\t]*(?:#+[ \\t]*)?$`
);

const SENSITIVE_GIT_PATHS = [
  'runtime',
  'userdata',
  '.demo',
  '.tmp-tests',
  '.tmp-dev-userdata',
  '.tmp-dev-runtime',
  'core.json',
  'settings.json',
  'state.json',
  'security.json',
  'storage.json',
  'storage.json.tmp',
  'storage.json.previous',
  'storage.json.previous.tmp'
];

const REQUIRED_IGNORED_PATHS = [
  'runtime',
  'userdata',
  '.demo',
  '.tmp-tests',
  '.tmp-dev-userdata',
  '.tmp-dev-runtime'
];

const REQUIRED_IGNORED_PATH_PROBES = [
  'runtime/cache/file',
  '.demo/core.json',
  'userdata/storage.json',
  'userdata/core.json',
  'userdata/settings.json',
  'userdata/state.json',
  'userdata/security.json',
  '.tmp-tests/test.js',
  '.tmp-dev-userdata/storage.json',
  '.tmp-dev-runtime/session/file'
];

const REQUIRED_BUILD_EXCLUDED_PATHS = [
  '.demo/core.json',
  '.demo/settings.json',
  '.demo/state.json',
  '.demo/security.json',
  'userdata/core.json',
  'userdata/settings.json',
  'userdata/state.json',
  'userdata/security.json',
  'userdata/storage.json',
  'runtime/cache/file',
  '.tmp-tests/test.js',
  '.tmp-dev-userdata/storage.json',
  '.tmp-dev-runtime/session/file',
  'AppData/NetraFlow/file',
  'release/installer/file.exe'
];

const PACKAGE_MAIN_ENTRY = 'dist-electron/main.js';
const BROAD_ASAR_UNPACK_PATTERNS = [
  '**',
  '**/*',
  'app',
  'app/**',
  'app/**/*',
  'resources',
  'resources/**',
  'resources/**/*',
  'node_modules',
  'node_modules/**',
  'node_modules/**/*',
  '**/node_modules',
  '**/node_modules/**',
  '**/node_modules/**/*'
];

const normalizePath = (filePath) =>
  String(filePath ?? '')
    .replaceAll('\\', '/')
    .replace(/^\.\//, '')
    .replace(/\/+$/, '');

const segmentPatternToRegExp = (segment) =>
  new RegExp(
    `^${segment
      .replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]')}$`
  );

export const matchesGlob = (pattern, targetPath) => {
  const normalizedPattern = normalizePath(pattern).replace(/^!/, '').replace(/^\//, '');
  const normalizedTarget = normalizePath(targetPath);
  const patternSegments = normalizedPattern.split('/').filter(Boolean);
  const targetSegments = normalizedTarget.split('/').filter(Boolean);

  const matchFrom = (patternIndex, targetIndex) => {
    if (patternIndex === patternSegments.length) {
      return targetIndex === targetSegments.length;
    }

    const segment = patternSegments[patternIndex];

    if (segment === '**') {
      for (let nextIndex = targetIndex; nextIndex <= targetSegments.length; nextIndex += 1) {
        if (matchFrom(patternIndex + 1, nextIndex)) {
          return true;
        }
      }

      return false;
    }

    if (targetIndex >= targetSegments.length) {
      return false;
    }

    return (
      segmentPatternToRegExp(segment).test(targetSegments[targetIndex]) &&
      matchFrom(patternIndex + 1, targetIndex + 1)
    );
  };

  return matchFrom(0, 0);
};

const isBuildPathExcluded = (files, targetPath) => {
  if (!Array.isArray(files)) {
    return false;
  }

  const stringRules = files.filter((rule) => typeof rule === 'string');
  const includeRules = stringRules.filter((rule) => !rule.startsWith('!'));
  const excludedByRule = stringRules
    .filter((rule) => rule.startsWith('!'))
    .some((rule) => matchesGlob(rule.slice(1), targetPath));

  if (excludedByRule) {
    return true;
  }

  if (includeRules.length === 0) {
    return false;
  }

  return !includeRules.some((rule) => matchesGlob(rule, targetPath));
};

const createReport = () => ({ entries: [], errors: [], warnings: [] });

const pass = (report, message) => {
  report.entries.push({ level: 'pass', message });
};

const warn = (report, message) => {
  report.warnings.push(message);
  report.entries.push({ level: 'warn', message });
};

const fail = (report, message) => {
  report.errors.push(message);
  report.entries.push({ level: 'error', message });
};

export const isValidReleaseVersion = (version) =>
  typeof version === 'string' && VERSION_PATTERN.test(version);

export const isValidReleaseTag = (tag) =>
  typeof tag === 'string' && RELEASE_TAG_PATTERN.test(tag);

export const parseReleaseVersion = (version) => {
  const match = typeof version === 'string' ? version.match(VERSION_PATTERN) : null;

  if (!match) {
    throw new Error(`Release version is not valid: ${version ?? '<missing>'}`);
  }

  return {
    version,
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    suffix: match[4] ?? ''
  };
};

export const isPrereleaseVersion = (version) => {
  const parsed = parseReleaseVersion(version);

  return parsed.major === 0 || /beta|rc/i.test(parsed.suffix);
};

export const createReleaseMetadataFromTag = (releaseTag, productName = 'NetraFlow') => {
  if (!isValidReleaseTag(releaseTag)) {
    throw new Error(`Release tag is not valid: ${releaseTag ?? '<missing>'}`);
  }

  const releaseVersion = releaseTag.slice(1);

  return {
    releaseTag,
    releaseVersion,
    isPrerelease: isPrereleaseVersion(releaseVersion),
    title: `${productName} ${releaseVersion}`,
    installerName: `${productName}_${releaseVersion}_x64_Setup.exe`,
    portableName: `${productName}_${releaseVersion}_x64_Portable.zip`
  };
};

const extractNodeScriptPath = (scriptValue) => {
  if (typeof scriptValue !== 'string') {
    return null;
  }

  const match = scriptValue.match(/^node\s+([^\s]+)(?:\s|$)/);

  return match ? normalizePath(match[1]) : null;
};

const hasExistingPath = (input, relativePath) =>
  input.existingPaths.has(normalizePath(relativePath));

const hasChangelogHeading = (text, version) => {
  if (!isValidReleaseVersion(version)) {
    return false;
  }

  return String(text ?? '')
    .split(/\r?\n/)
    .some((line) => {
      const match = line.match(CHANGELOG_VERSION_HEADING_PATTERN);

      return match && (match[1] ?? match[6]) === version;
    });
};

export const getReleaseTagFromEnv = (env = {}) => {
  if (typeof env.NETRAFLOW_RELEASE_TAG === 'string' && env.NETRAFLOW_RELEASE_TAG.length > 0) {
    return { source: 'NETRAFLOW_RELEASE_TAG', value: env.NETRAFLOW_RELEASE_TAG };
  }

  if (
    env.GITHUB_REF_TYPE === 'tag' &&
    typeof env.GITHUB_REF_NAME === 'string' &&
    env.GITHUB_REF_NAME.length > 0
  ) {
    return { source: 'GITHUB_REF_NAME', value: env.GITHUB_REF_NAME };
  }

  return null;
};

export const getExpectedReleaseArtifacts = ({ productName, version }) => ({
  installer: `${productName}_${version}_x64_Setup.exe`,
  portable: `${productName}_${version}_x64_Portable.zip`
});

const checkVersions = (input, report) => {
  const packageVersion = input.packageJson?.version;
  const lockVersion = input.packageLockJson?.version;
  const lockRootVersion = input.packageLockJson?.packages?.['']?.version;

  if (!isValidReleaseVersion(packageVersion)) {
    fail(report, `package version is not a valid release version: ${packageVersion ?? '<missing>'}`);
  } else {
    pass(report, `package version: ${packageVersion}`);
  }

  if (typeof lockVersion !== 'string') {
    fail(report, 'package-lock version is missing');
  } else if (lockVersion !== packageVersion) {
    fail(report, `package-lock root version is ${lockVersion}, expected ${packageVersion}`);
  }

  if (typeof lockRootVersion !== 'string') {
    fail(report, 'package-lock packages[""].version is missing');
  } else if (lockRootVersion !== packageVersion) {
    fail(
      report,
      `package-lock packages[""].version is ${lockRootVersion}, expected ${packageVersion}`
    );
  }

  if (lockVersion === packageVersion && lockRootVersion === packageVersion) {
    pass(report, 'lockfile versions match');
  }
};

const checkChangelog = (input, report) => {
  const version = input.packageJson?.version;

  if (typeof input.changelogText !== 'string') {
    fail(report, 'CHANGELOG.md is missing');
    return;
  }

  if (typeof version !== 'string' || !hasChangelogHeading(input.changelogText, version)) {
    fail(report, `CHANGELOG has no version heading for ${version ?? '<missing>'}`);
    return;
  }

  pass(report, 'CHANGELOG entry found');
};

const checkTag = (input, report) => {
  const tag = getReleaseTagFromEnv(input.env);
  const version = input.packageJson?.version;

  if (!tag) {
    pass(report, 'release tag not required for local run');
    return;
  }

  const expectedTag = `v${version}`;

  if (tag.value !== expectedTag) {
    fail(report, `${tag.source} is ${tag.value}, expected ${expectedTag}`);
    return;
  }

  pass(report, `release tag matches: ${tag.value}`);
};

const checkRequiredPath = (input, report, relativePath, label) => {
  if (relativePath && hasExistingPath(input, relativePath)) {
    pass(report, `${label} found`);
    return true;
  }

  fail(report, `${label} is missing: ${relativePath ?? '<not configured>'}`);
  return false;
};

const checkPackageMain = (input, report) => {
  const configuredMainPath = input.packageJson?.main;

  if (typeof configuredMainPath !== 'string') {
    fail(report, 'package.json.main is missing');
    return;
  }

  if (configuredMainPath !== PACKAGE_MAIN_ENTRY) {
    fail(
      report,
      `package.json.main is ${configuredMainPath || '<empty>'}, expected ${PACKAGE_MAIN_ENTRY}`
    );
    return;
  }

  pass(report, `package.json.main: ${PACKAGE_MAIN_ENTRY}`);
};

const checkRequiredPaths = (input, report) => {
  const scripts = input.packageJson?.scripts ?? {};
  const build = input.packageJson?.build ?? {};
  const installerScriptPath = extractNodeScriptPath(scripts['dist:installer']);
  const portableScriptPath = extractNodeScriptPath(scripts['dist:portable']);
  const iconPath = normalizePath(build.win?.icon ?? build.icon ?? '');
  const nsisInclude = normalizePath(build.nsis?.include ?? '');
  const licensePath = input.licensePaths.find((candidate) => hasExistingPath(input, candidate));

  checkRequiredPath(input, report, installerScriptPath, 'installer script');
  checkRequiredPath(input, report, portableScriptPath, 'portable script');
  checkRequiredPath(input, report, 'electron/main.ts', 'Electron main source');
  checkRequiredPath(input, report, 'electron/preload.ts', 'Electron preload source');
  checkPackageMain(input, report);
  checkRequiredPath(input, report, iconPath, 'application icon');
  checkRequiredPath(input, report, licensePath, 'license file');
  checkRequiredPath(input, report, nsisInclude, 'NSIS include');
};

const checkArtifactNaming = (input, report) => {
  const productName = input.packageJson?.productName ?? 'NetraFlow';
  const version = input.packageJson?.version;
  const artifactNameTemplate = input.packageJson?.build?.win?.artifactName;
  const artifacts = getExpectedReleaseArtifacts({ productName, version });
  const setupNameFromTemplate =
    typeof artifactNameTemplate === 'string'
      ? artifactNameTemplate.replaceAll('${version}', version).replaceAll('${arch}', 'x64').replaceAll('${ext}', 'exe')
      : '';

  if (setupNameFromTemplate !== artifacts.installer) {
    fail(
      report,
      `installer artifact naming is ${setupNameFromTemplate || '<missing>'}, expected ${artifacts.installer}`
    );
  } else {
    pass(report, `installer artifact name: ${artifacts.installer}`);
  }

  if (input.packageJson?.build?.nsis?.differentialPackage === false) {
    pass(report, 'NSIS differential package disabled');
  } else {
    fail(report, 'NSIS differential package must be disabled');
  }

  const portableSource = input.scriptSources.portable ?? '';

  if (
    portableSource.includes('const bundleName = `${productName}_${version}_x64`;') &&
    portableSource.includes('`${productName}_${version}_x64_Portable.zip`')
  ) {
    pass(report, `portable artifact name: ${artifacts.portable}`);
  } else {
    fail(report, `portable artifact naming rule is missing, expected ${artifacts.portable}`);
  }
};

const isSensitiveTrackedPath = (trackedPath) => {
  const normalized = normalizePath(trackedPath);

  return SENSITIVE_GIT_PATHS.some((sensitivePath) => {
    const normalizedSensitive = normalizePath(sensitivePath);

    return normalized === normalizedSensitive || normalized.startsWith(`${normalizedSensitive}/`);
  });
};

const checkGitExclusions = (input, report, options) => {
  const git = input.gitInfo;

  if (!git?.available) {
    warn(report, `Git checks unavailable: ${git?.message ?? 'git command failed'}`);
    return;
  }

  const ignoredPaths = new Set((git.ignoredPaths ?? []).map(normalizePath));
  const missingIgnoredPaths = REQUIRED_IGNORED_PATHS.filter((pathName) => {
    const normalized = normalizePath(pathName);

    return ![...ignoredPaths].some(
      (ignoredPath) => ignoredPath === normalized || ignoredPath.startsWith(`${normalized}/`)
    );
  });

  if (missingIgnoredPaths.length > 0) {
    fail(report, `Git ignore rules do not cover: ${missingIgnoredPaths.join(', ')}`);
  } else {
    pass(report, 'Git ignores runtime/userdata temp paths');
  }

  const trackedSensitivePaths = (git.trackedPaths ?? []).filter(isSensitiveTrackedPath);

  if (trackedSensitivePaths.length > 0) {
    fail(report, `Git tracks user/runtime data paths: ${trackedSensitivePaths.join(', ')}`);
  } else {
    pass(report, 'Git tracks no runtime/userdata storage files');
  }

  if ((git.dirtyLines ?? []).length > 0) {
    if (options.strict) {
      fail(report, 'Git worktree is dirty');
    } else {
      warn(report, 'Git worktree is dirty');
    }
  } else {
    pass(report, 'Git worktree is clean');
  }

  if (options.strict) {
    if (git.branchReadable === false) {
      fail(report, 'Git branch information is not readable');
    }

    if (git.commitReadable === false) {
      fail(report, 'Git commit information is not readable');
    }
  }
};

const checkBuildExclusions = (input, report) => {
  const files = input.packageJson?.build?.files;
  const uncoveredPaths = REQUIRED_BUILD_EXCLUDED_PATHS.filter(
    (targetPath) => !isBuildPathExcluded(files, targetPath)
  );

  if (uncoveredPaths.length > 0) {
    fail(report, `electron-builder files do not exclude: ${uncoveredPaths.join(', ')}`);
    return;
  }

  pass(report, 'runtime/userdata excluded from packaged files');
};

const normalizeAsarUnpackPatterns = (asarUnpack) => {
  if (typeof asarUnpack === 'string') {
    return [asarUnpack];
  }

  if (Array.isArray(asarUnpack)) {
    return asarUnpack.filter((pattern) => typeof pattern === 'string');
  }

  return [];
};

const checkAsarConfig = (input, report) => {
  const build = input.packageJson?.build;

  if (!build || typeof build !== 'object') {
    fail(report, 'electron-builder build config is missing');
    return;
  }

  if (build.asar !== true) {
    fail(report, 'electron-builder asar must be true');
  } else {
    pass(report, 'electron-builder ASAR packaging enabled');
  }

  const asarUnpackPatterns = normalizeAsarUnpackPatterns(build.asarUnpack);
  const broadPatterns = asarUnpackPatterns
    .map(normalizePath)
    .filter((pattern) => BROAD_ASAR_UNPACK_PATTERNS.includes(pattern.toLowerCase()));

  if (broadPatterns.length > 0) {
    fail(report, `electron-builder asarUnpack is too broad: ${broadPatterns.join(', ')}`);
    return;
  }

  pass(report, 'electron-builder asarUnpack does not unpack the app or full node_modules tree');
};

const isWindowsTarget = (target) => {
  if (typeof target === 'string') {
    return target === 'nsis' || target === 'portable' || target === 'dir';
  }

  return target?.target === 'nsis' || target?.target === 'portable' || target?.target === 'dir';
};

const checkWindowsBoundary = (input, report) => {
  const winTargets = input.packageJson?.build?.win?.target;
  const targets = Array.isArray(winTargets) ? winTargets : [winTargets].filter(Boolean);

  if (targets.length > 0 && targets.every(isWindowsTarget)) {
    pass(report, 'Windows release target configured');
  } else {
    fail(report, 'Windows release target is missing or unexpected');
  }

  if (input.packageJson?.build?.win?.signAndEditExecutable === false) {
    warn(report, 'Windows code signing is disabled');
  }
};

export const evaluateReleaseCheck = (input, options = {}) => {
  const report = createReport();
  const normalizedOptions = { strict: options.strict === true };

  checkVersions(input, report);
  checkChangelog(input, report);
  checkTag(input, report);
  checkRequiredPaths(input, report);
  checkArtifactNaming(input, report);
  checkGitExclusions(input, report, normalizedOptions);
  checkBuildExclusions(input, report);
  checkAsarConfig(input, report);
  checkWindowsBoundary(input, report);

  return report;
};

const readJsonFile = (rootDir, relativePath) =>
  JSON.parse(readFileSync(path.join(rootDir, relativePath), 'utf8'));

const readTextFileIfExists = (rootDir, relativePath) => {
  const fullPath = path.join(rootDir, relativePath);

  return existsSync(fullPath) ? readFileSync(fullPath, 'utf8') : null;
};

const collectKnownExistingPaths = (rootDir, packageJson) => {
  const paths = new Set();
  const candidates = [
    'CHANGELOG.md',
    'LICENSE',
    'COPYING',
    'electron/main.ts',
    'electron/preload.ts',
    normalizePath(packageJson?.build?.win?.icon ?? packageJson?.build?.icon ?? ''),
    normalizePath(packageJson?.build?.nsis?.include ?? ''),
    extractNodeScriptPath(packageJson?.scripts?.['dist:installer']),
    extractNodeScriptPath(packageJson?.scripts?.['dist:portable'])
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(path.join(rootDir, candidate))) {
      paths.add(normalizePath(candidate));
    }
  }

  return paths;
};

const runGit = (rootDir, args) => {
  try {
    return {
      ok: true,
      stdout: execFileSync('git', args, {
        cwd: rootDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      })
    };
  } catch (error) {
    return {
      ok: false,
      stdout: typeof error.stdout === 'string' ? error.stdout : '',
      stderr: typeof error.stderr === 'string' ? error.stderr : '',
      message: error instanceof Error ? error.message : String(error)
    };
  }
};

const parseCheckIgnoreOutput = (stdout) =>
  stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => normalizePath(line.split(/\t/).at(-1) ?? line.split(/\s+/).at(-1) ?? line));

export const collectGitInfo = (rootDir) => {
  const tracked = runGit(rootDir, ['ls-files', ...SENSITIVE_GIT_PATHS]);

  if (!tracked.ok) {
    return {
      available: false,
      message: tracked.stderr || tracked.message
    };
  }

  const ignored = runGit(rootDir, [
    'check-ignore',
    '-v',
    '--no-index',
    ...REQUIRED_IGNORED_PATH_PROBES
  ]);
  const status = runGit(rootDir, ['status', '--porcelain']);
  const branch = runGit(rootDir, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const commit = runGit(rootDir, ['rev-parse', '--verify', 'HEAD']);

  return {
    available: true,
    trackedPaths: tracked.stdout.split(/\r?\n/).filter(Boolean).map(normalizePath),
    ignoredPaths: parseCheckIgnoreOutput(ignored.stdout),
    dirtyLines: status.ok ? status.stdout.split(/\r?\n/).filter(Boolean) : [],
    branchReadable: branch.ok && branch.stdout.trim().length > 0,
    commitReadable: commit.ok && commit.stdout.trim().length > 0,
    statusMessage: status.ok ? '' : status.stderr || status.message
  };
};

export const readReleaseCheckInput = ({
  rootDir,
  env = process.env,
  gitInfo = collectGitInfo(rootDir)
}) => {
  const packageJson = readJsonFile(rootDir, 'package.json');
  const packageLockJson = readJsonFile(rootDir, 'package-lock.json');
  const installerScriptPath = extractNodeScriptPath(packageJson.scripts?.['dist:installer']);
  const portableScriptPath = extractNodeScriptPath(packageJson.scripts?.['dist:portable']);

  return {
    rootDir,
    packageJson,
    packageLockJson,
    changelogText: readTextFileIfExists(rootDir, 'CHANGELOG.md'),
    existingPaths: collectKnownExistingPaths(rootDir, packageJson),
    licensePaths: ['LICENSE', 'COPYING'],
    scriptSources: {
      installer: installerScriptPath ? readTextFileIfExists(rootDir, installerScriptPath) : null,
      portable: portableScriptPath ? readTextFileIfExists(rootDir, portableScriptPath) : null
    },
    env,
    gitInfo
  };
};

export const formatReleaseCheckReport = (report) => {
  const lines = ['NetraFlow release check', ''];

  for (const entry of report.entries) {
    const prefix = entry.level === 'pass' ? '[ok]' : entry.level === 'warn' ? '[warn]' : '[error]';
    lines.push(`${prefix} ${entry.message}`);
  }

  lines.push('');

  if (report.errors.length > 0) {
    lines.push(`Release check failed with ${report.errors.length} error(s).`);
  } else {
    lines.push('Release check passed.');
  }

  return `${lines.join('\n')}\n`;
};
