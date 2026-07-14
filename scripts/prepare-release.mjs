import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const version = packageJson.version;
const tag = `v${version}`;
const refType = process.env.GITHUB_REF_TYPE;
const refName = process.env.GITHUB_REF_NAME;
const githubSha = process.env.GITHUB_SHA;
const versionMatch = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z][0-9A-Za-z.-]*))?$/.exec(version);

if (!versionMatch) throw new Error(`package.json version is invalid: ${version}`);
if (refType !== 'tag') throw new Error(`Release workflow requires a tag ref; received ${refType ?? '<missing>'}.`);
if (refName !== tag) throw new Error(`Trigger tag ${refName} does not match package.json tag ${tag}.`);
if (!/^[0-9a-f]{40}$/i.test(githubSha ?? '')) throw new Error(`GITHUB_SHA is invalid: ${githubSha ?? '<missing>'}`);

const git = (...args) => execFileSync('git', args, { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const head = git('rev-parse', 'HEAD');
const tagCommit = git('rev-list', '-n', '1', tag);
if (head !== githubSha || tagCommit !== githubSha) {
  throw new Error(`Release identity mismatch: HEAD=${head}, tag=${tagCommit}, github.sha=${githubSha}.`);
}

const prerelease = versionMatch[1] === '0' || Boolean(versionMatch[4]);
const outputs = { version, tag, commit: githubSha, prerelease: String(prerelease) };
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `${Object.entries(outputs).map(([key, value]) => `${key}=${value}`).join('\n')}\n`, 'utf8');
}
console.log(`Prepared ${tag} at ${githubSha}; prerelease=${prerelease}.`);
