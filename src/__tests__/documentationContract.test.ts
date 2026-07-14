import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const projectRoot = process.cwd();

const readProjectFile = (filePath: string) =>
  readFileSync(path.join(projectRoot, filePath), 'utf8').replace(/\r\n?/g, '\n');

const packageJson = JSON.parse(readProjectFile('package.json')) as { version: string };
const packageLockJson = JSON.parse(readProjectFile('package-lock.json')) as {
  version: string;
  packages?: Record<string, { version?: string }>;
};
const changelog = readProjectFile('CHANGELOG.md');
const readme = readProjectFile('README.md');
const readmeEnglish = readProjectFile('README_EN.md');
const agents = readProjectFile('AGENTS.md');

const artifactTemplates = [
  'NetraFlow_<version>_x64_Setup.exe',
  'NetraFlow_<version>_x64_Portable.zip',
  'NetraFlow_<version>_arm64.dmg',
  'NetraFlow_<version>_x64.AppImage',
  'NetraFlow_<version>_x64.deb'
] as const;

test('current version is synchronized across package metadata and changelog', () => {
  assert.equal(packageJson.version, '0.9.10');
  assert.equal(packageLockJson.version, packageJson.version);
  assert.equal(packageLockJson.packages?.['']?.version, packageJson.version);
  assert.equal(changelog.match(/^##\s+(\S+)/m)?.[1], packageJson.version);
});

test('Chinese and English READMEs publish the same five architecture-qualified artifacts', () => {
  for (const artifact of artifactTemplates) {
    assert.equal(readme.includes(artifact), true, `README.md is missing ${artifact}`);
    assert.equal(readmeEnglish.includes(artifact), true, `README_EN.md is missing ${artifact}`);
  }

  assert.equal(artifactTemplates.filter((name) => name.includes('_x64_Setup.exe')).length, 1);
  assert.equal(artifactTemplates.filter((name) => name.includes('_x64_Portable.zip')).length, 1);
  assert.equal(artifactTemplates.filter((name) => name.includes('_arm64.dmg')).length, 1);
  assert.equal(artifactTemplates.filter((name) => name.includes('_x64.AppImage')).length, 1);
  assert.equal(artifactTemplates.filter((name) => name.includes('_x64.deb')).length, 1);
});

test('current documentation has no obsolete Windows-only or unqualified artifact claims', () => {
  const currentDocs = `${readme}\n${readmeEnglish}\n${agents}`;
  const obsoleteClaims = [
    /primarily for Windows/i,
    /主要面向 Windows/,
    /macOS (?:and|和) Linux (?:are not|不是).*release targets?/i,
    /Windows verification and release workflows/i,
    /NetraFlow_<version>_Setup\.exe/,
    /NetraFlow_<version>_Portable\.zip/
  ];

  for (const claim of obsoleteClaims) {
    assert.equal(claim.test(currentDocs), false, `obsolete documentation claim: ${claim}`);
  }
});

test("AGENTS records long-lived platform and release boundaries", () => {
  assert.equal(
    agents.includes("平台支持范围以当前构建配置和 README 为准"),
    true,
  )
  assert.equal(
    agents.includes("未经明确要求，不增加新的 CPU 架构、包格式或移动端目标"),
    true,
  )
  assert.equal(
    agents.includes("一个版本只对应一个 tag 和一个 GitHub Release"),
    true,
  )
  assert.equal(
    agents.includes("所有平台必须从同一个 tag、同一个 commit、同一个版本号构建"),
    true,
  )
  assert.equal(
    agents.includes("最终只能由一个发布任务创建一个 Draft Release"),
    true,
  )
  assert.equal(
    agents.includes("未经明确授权，不得触发、修改或执行远端发布操作"),
    true,
  )
})

test('README language links and local license links resolve', () => {
  assert.match(readme, /href="README_EN\.md"/);
  assert.match(readmeEnglish, /href="README\.md"/);
  assert.equal(readme.includes('](LICENSE)'), true);
  assert.equal(readmeEnglish.includes('](LICENSE)'), true);
  assert.equal(existsSync(path.join(projectRoot, 'README.md')), true);
  assert.equal(existsSync(path.join(projectRoot, 'README_EN.md')), true);
  assert.equal(existsSync(path.join(projectRoot, 'LICENSE')), true);
  assert.equal(existsSync(path.join(projectRoot, 'src/assets/brand/netraflow-logo.svg')), true);
});
